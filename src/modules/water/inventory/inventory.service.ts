import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { requireIdempotencyKey, WaterErrorCode, waterBadRequest } from '../common/water-api-error';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { WaterAuditAction, WaterBusinessEventType, WaterInventoryMovementType } from '../common/water.enums';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return {
      balances: this.store.list('agent_inventory'),
      movements: this.store.list('inventory_movements'),
      computed_balances: this.getComputedBalances(),
    };
  }

  createMovement(dto: CreateInventoryMovementDto) {
    requireIdempotencyKey(dto.idempotency_key);
    if (!dto.reason) {
      throw waterBadRequest(WaterErrorCode.ValidationFailed, 'inventory movement reason is required');
    }

    const { record: movement, created } = this.store.createIdempotent('inventory_movements', dto.idempotency_key, {
      sku_code: 'barrel_water_18l',
      ...dto,
    });
    if (!created) {
      return movement;
    }

    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.CreateInventoryMovement,
      targetType: 'water_inventory_movement',
      targetId: movement.id,
      after: movement,
      reason: dto.reason,
      metadata: {
        movement_type: dto.movement_type,
        quantity: dto.quantity,
      },
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.InventoryMoved,
      aggregateType: 'water_inventory_movement',
      aggregateId: movement.id,
      payload: movement,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.InventoryMoved}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return movement;
  }

  getInventoryBalance(input: { agent_id?: string | null; service_point_id?: string | null; sku_code?: string }): number {
    const skuCode = input.sku_code ?? 'barrel_water_18l';
    return this.store
      .list('inventory_movements')
      .filter((movement) => movement.sku_code === skuCode)
      .reduce((balance, movement) => balance + this.inventoryDeltaForHolder(movement, input), 0);
  }

  moveHqToAgent(input: Omit<CreateInventoryMovementDto, 'movement_type'>) {
    return this.createMovement({
      ...input,
      movement_type: WaterInventoryMovementType.HqToAgent,
    });
  }

  moveAgentToServicePoint(input: Omit<CreateInventoryMovementDto, 'movement_type'>) {
    this.assertAvailable(
      { agent_id: input.agent_id, sku_code: input.sku_code },
      Number(input.quantity),
      'agent inventory is insufficient',
    );
    return this.createMovement({
      ...input,
      movement_type: WaterInventoryMovementType.AgentToServicePoint,
    });
  }

  consumeForDelivery(input: Omit<CreateInventoryMovementDto, 'movement_type'>) {
    this.assertAvailable(
      { agent_id: input.agent_id, service_point_id: input.service_point_id, sku_code: input.sku_code },
      Number(input.quantity),
      'delivery inventory is insufficient',
    );
    return this.createMovement({
      ...input,
      movement_type: WaterInventoryMovementType.DeliveryOut,
    });
  }

  stocktakeAdjustment(input: Omit<CreateInventoryMovementDto, 'movement_type'>) {
    return this.createMovement({
      ...input,
      movement_type: WaterInventoryMovementType.StocktakeAdjustment,
    });
  }

  private assertAvailable(
    holder: { agent_id?: string | null; service_point_id?: string | null; sku_code?: string },
    quantity: number,
    message: string,
  ) {
    if (this.getInventoryBalance(holder) < quantity) {
      throw waterBadRequest(WaterErrorCode.InventoryInsufficient, message, {
        ...holder,
        requested_quantity: quantity,
      });
    }
  }

  private getComputedBalances() {
    const holders = new Map<string, { agent_id?: unknown; service_point_id?: unknown; sku_code: string; balance: number }>();
    for (const movement of this.store.list('inventory_movements')) {
      const skuCode = String(movement.sku_code ?? 'barrel_water_18l');
      for (const holder of this.holdersTouchedByMovement(movement)) {
        const key = `${holder.agent_id ?? ''}:${holder.service_point_id ?? ''}:${skuCode}`;
        const current = holders.get(key) ?? { ...holder, sku_code: skuCode, balance: 0 };
        current.balance += this.inventoryDeltaForHolder(movement, holder);
        holders.set(key, current);
      }
    }

    return [...holders.values()];
  }

  private holdersTouchedByMovement(movement: Record<string, unknown>) {
    return [
      { agent_id: movement.agent_id, service_point_id: undefined },
      { agent_id: movement.agent_id, service_point_id: movement.service_point_id },
      { agent_id: undefined, service_point_id: movement.service_point_id },
    ].filter((holder) => holder.agent_id || holder.service_point_id);
  }

  private inventoryDeltaForHolder(
    movement: Record<string, unknown>,
    holder: { agent_id?: unknown; service_point_id?: unknown },
  ): number {
    const quantity = Number(movement.quantity ?? 0);
    const sameAgent = holder.agent_id && holder.agent_id === movement.agent_id;
    const sameServicePoint = holder.service_point_id && holder.service_point_id === movement.service_point_id;

    switch (movement.movement_type) {
      case WaterInventoryMovementType.HqToAgent:
        return sameAgent && !holder.service_point_id ? quantity : 0;
      case WaterInventoryMovementType.AgentToServicePoint:
        if (sameAgent && !holder.service_point_id) return -quantity;
        if (sameServicePoint) return quantity;
        return 0;
      case WaterInventoryMovementType.DeliveryOut:
      case WaterInventoryMovementType.Damage:
      case WaterInventoryMovementType.Loss:
        return sameServicePoint || (sameAgent && !movement.service_point_id) ? -quantity : 0;
      case WaterInventoryMovementType.ReturnIn:
        return sameServicePoint || (sameAgent && !movement.service_point_id) ? quantity : 0;
      case WaterInventoryMovementType.StocktakeAdjustment:
        return sameServicePoint || (sameAgent && !movement.service_point_id) ? quantity : 0;
      default:
        return 0;
    }
  }
}
