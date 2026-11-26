import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { requireIdempotencyKey, WaterErrorCode, waterConflict } from '../common/water-api-error';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { WaterAuditAction, WaterBarrelStatus, WaterBusinessEventType } from '../common/water.enums';
import { CreateBarrelDto } from './dto/create-barrel.dto';
import { CreateBarrelMovementDto } from './dto/create-barrel-movement.dto';

@Injectable()
export class BarrelsService {
  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return {
      barrels: this.store.list('barrels'),
      movements: this.store.list('barrel_movements'),
    };
  }

  create(dto: CreateBarrelDto) {
    return this.createBarrel(dto);
  }

  createBarrel(dto: CreateBarrelDto) {
    const existingByCode = this.store.findByField('barrels', 'barrel_code', dto.barrel_code);
    if (existingByCode) {
      return existingByCode;
    }

    const { record: barrel, created } = this.store.createIdempotent('barrels', dto.idempotency_key, {
      barrel_status: WaterBarrelStatus.HqStock,
      ...dto,
    });
    if (!created) {
      return barrel;
    }

    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.CreateBarrel,
      targetType: 'water_barrel',
      targetId: barrel.id,
      after: barrel,
      metadata: { barrel_code: dto.barrel_code },
    });
    return barrel;
  }

  createMovement(barrelId: string, dto: CreateBarrelMovementDto) {
    return this.moveBarrel(barrelId, dto);
  }

  moveBarrel(barrelId: string, dto: CreateBarrelMovementDto) {
    requireIdempotencyKey(dto.idempotency_key);
    const existing = this.store.findByField('barrel_movements', 'idempotency_key', dto.idempotency_key);
    if (existing) {
      return existing;
    }

    const before = this.store.get('barrels', barrelId);
    if (
      (before.barrel_status === WaterBarrelStatus.Lost || before.barrel_status === WaterBarrelStatus.Scrapped) &&
      dto.movement_type === 'RETURNED'
    ) {
      throw waterConflict(WaterErrorCode.BarrelInvalidState, 'lost or scrapped barrel cannot be returned as normal stock', {
        barrel_id: barrelId,
        barrel_status: before.barrel_status,
      });
    }

    if (dto.movement_type === 'RETURNED' && before.barrel_status !== WaterBarrelStatus.AtCustomer) {
      throw waterConflict(WaterErrorCode.BarrelInvalidState, 'only AT_CUSTOMER barrels can be returned in V0', {
        barrel_id: barrelId,
        barrel_status: before.barrel_status,
      });
    }

    const { record: movement, created } = this.store.createIdempotent('barrel_movements', dto.idempotency_key, {
      barrel_id: barrelId,
      from_holder_type: before.current_holder_type ?? dto.from_holder_type ?? null,
      from_holder_id: before.current_holder_id ?? dto.from_holder_id ?? null,
      ...dto,
    });
    if (!created) {
      return movement;
    }

    const barrel = this.store.update('barrels', barrelId, {
      barrel_status: dto.next_status ?? this.statusForMovement(dto.movement_type),
      current_holder_type: dto.to_holder_type ?? before.current_holder_type ?? null,
      current_holder_id: dto.to_holder_id ?? before.current_holder_id ?? null,
      updated_by: dto.created_by,
    });
    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.MoveBarrel,
      targetType: 'water_barrel_movement',
      targetId: movement.id,
      before,
      after: barrel,
      reason: dto.reason,
      metadata: {
        barrel_id: barrelId,
        movement_type: dto.movement_type,
      },
    });
    this.businessEvents.create({
      eventType: this.eventTypeForMovement(dto.movement_type),
      aggregateType: 'water_barrel_movement',
      aggregateId: movement.id,
      payload: movement,
      idempotencyKey: dto.idempotency_key
        ? `event:${this.eventTypeForMovement(dto.movement_type)}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return movement;
  }

  checkoutBarrel(input: {
    barrelId: string;
    customerId: string;
    actorId?: string;
    actorRole?: any;
    idempotencyKey?: string;
    reason?: string;
  }) {
    return this.moveBarrel(input.barrelId, {
      movement_type: 'CHECKED_OUT',
      to_holder_type: 'CUSTOMER',
      to_holder_id: input.customerId,
      next_status: WaterBarrelStatus.AtCustomer,
      created_by: input.actorId,
      actor_role: input.actorRole,
      idempotency_key: input.idempotencyKey,
      reason: input.reason,
    });
  }

  returnBarrel(input: {
    barrelId: string;
    toHolderType: string;
    toHolderId: string;
    actorId?: string;
    actorRole?: any;
    idempotencyKey?: string;
    reason?: string;
  }) {
    return this.moveBarrel(input.barrelId, {
      movement_type: 'RETURNED',
      to_holder_type: input.toHolderType,
      to_holder_id: input.toHolderId,
      next_status:
        input.toHolderType === 'SERVICE_POINT'
          ? WaterBarrelStatus.ServicePointStock
          : input.toHolderType === 'AGENT'
            ? WaterBarrelStatus.AgentStock
            : WaterBarrelStatus.HqStock,
      created_by: input.actorId,
      actor_role: input.actorRole,
      idempotency_key: input.idempotencyKey,
      reason: input.reason,
    });
  }

  markLostOrDamaged(input: {
    barrelId: string;
    status: WaterBarrelStatus.Lost | WaterBarrelStatus.Damaged;
    actorId?: string;
    actorRole?: any;
    idempotencyKey?: string;
    reason?: string;
  }) {
    return this.moveBarrel(input.barrelId, {
      movement_type: input.status === WaterBarrelStatus.Lost ? 'LOST' : 'DAMAGED',
      next_status: input.status,
      created_by: input.actorId,
      actor_role: input.actorRole,
      idempotency_key: input.idempotencyKey,
      reason: input.reason,
    });
  }

  private eventTypeForMovement(movementType: string): WaterBusinessEventType {
    if (movementType === 'RETURNED') {
      return WaterBusinessEventType.BarrelReturned;
    }

    if (movementType === 'LOST' || movementType === 'DAMAGED') {
      return WaterBusinessEventType.BarrelLostOrDamaged;
    }

    return WaterBusinessEventType.BarrelCheckedOut;
  }

  private statusForMovement(movementType: string): WaterBarrelStatus {
    if (movementType === 'RETURNED') {
      return WaterBarrelStatus.Returning;
    }

    if (movementType === 'LOST') {
      return WaterBarrelStatus.Lost;
    }

    if (movementType === 'DAMAGED') {
      return WaterBarrelStatus.Damaged;
    }

    return WaterBarrelStatus.AtCustomer;
  }
}
