import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { requireIdempotencyKey, WaterErrorCode, waterConflict } from '../common/water-api-error';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import {
  WaterAuditAction,
  WaterBusinessEventType,
  WaterDeliveryStatus,
  WaterOrderStatus,
  WaterPaymentStatus,
  WaterRole,
} from '../common/water.enums';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto, DeliverOrderDto } from './dto/deliver-order.dto';

@Injectable()
export class OrdersService {
  private readonly collection = 'orders';

  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return this.store.list(this.collection);
  }

  getRaw(id: string) {
    return this.store.get(this.collection, id);
  }

  create(dto: CreateOrderDto) {
    return this.createOrder(dto);
  }

  createOrder(dto: CreateOrderDto) {
    requireIdempotencyKey(dto.idempotency_key);
    const { record: order, created } = this.store.createIdempotent(this.collection, dto.idempotency_key, {
      order_status: WaterOrderStatus.Submitted,
      payment_status: WaterPaymentStatus.Unpaid,
      delivery_status: WaterDeliveryStatus.Pending,
      ticket_quantity_to_use: 0,
      barrel_quantity_to_return: 0,
      total_amount: 0,
      ...dto,
    });

    if (!created) {
      return order;
    }

    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.CreateOrder,
      targetType: 'water_order',
      targetId: order.id,
      after: order,
      metadata: { customer_id: dto.customer_id },
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.OrderCreated,
      aggregateType: 'water_order',
      aggregateId: order.id,
      payload: order,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.OrderCreated}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return order;
  }

  assign(id: string, dto: AssignOrderDto) {
    return this.assignOrder(id, dto);
  }

  assignOrder(id: string, dto: AssignOrderDto) {
    const before = this.store.get(this.collection, id);
    if (before.order_status === WaterOrderStatus.Cancelled || before.order_status === WaterOrderStatus.Delivered) {
      throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'order cannot be assigned from its current status', {
        order_id: id,
        order_status: before.order_status,
      });
    }

    const order = this.store.update(this.collection, id, {
      ...dto,
      order_status: WaterOrderStatus.Assigned,
      delivery_status: WaterDeliveryStatus.Assigned,
    });
    this.recordOrderStatusAudit(order.id, dto.updated_by, dto.actor_role, 'assign', before, order, dto.reason);
    return order;
  }

  deliver(id: string, updatedByOrDto?: string | DeliverOrderDto) {
    const dto = typeof updatedByOrDto === 'string' ? { updated_by: updatedByOrDto } : (updatedByOrDto ?? {});
    return this.deliverOrder(id, dto);
  }

  deliverOrder(id: string, dto: Partial<DeliverOrderDto> = {}) {
    requireIdempotencyKey(dto.idempotency_key);
    const actionKey = dto.idempotency_key ? `order-deliver:${dto.idempotency_key}` : undefined;
    const { created } = this.store.createIdempotent('order_actions', actionKey, {
      action: 'deliver',
      order_id: id,
      created_by: dto.updated_by,
    });
    if (!created) {
      return this.store.get(this.collection, id);
    }

    const before = this.store.get(this.collection, id);
    if (before.order_status === WaterOrderStatus.Cancelled) {
      throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'cancelled order cannot be delivered', {
        order_id: id,
        order_status: before.order_status,
      });
    }

    if (before.order_status === WaterOrderStatus.Delivered) {
      return before;
    }

    const order = this.store.update(this.collection, id, {
      order_status: WaterOrderStatus.Delivered,
      delivery_status: WaterDeliveryStatus.Delivered,
      updated_by: dto.updated_by,
    });
    this.recordOrderStatusAudit(order.id, dto.updated_by, dto.actor_role, 'deliver', before, order, dto.reason);
    this.businessEvents.create({
      eventType: WaterBusinessEventType.OrderDelivered,
      aggregateType: 'water_order',
      aggregateId: order.id,
      payload: order,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.OrderDelivered}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.updated_by,
    });
    return order;
  }

  cancel(id: string, updatedBy?: string) {
    return this.cancelOrder(id, { updated_by: updatedBy });
  }

  cancelOrder(id: string, dto: CancelOrderDto) {
    const actionKey = dto.idempotency_key ? `order-cancel:${dto.idempotency_key}` : undefined;
    const { created } = this.store.createIdempotent('order_actions', actionKey, {
      action: 'cancel',
      order_id: id,
      created_by: dto.updated_by,
    });
    if (!created) {
      return this.store.get(this.collection, id);
    }

    const before = this.store.get(this.collection, id);
    if (before.order_status === WaterOrderStatus.Delivered) {
      throw waterConflict(
        WaterErrorCode.OrderInvalidStatus,
        'delivered order cannot be directly cancelled in V0; use refund and reverse movement flow later',
        {
          order_id: id,
          order_status: before.order_status,
        },
      );
    }

    if (before.order_status === WaterOrderStatus.Cancelled) {
      return before;
    }

    const order = this.store.update(this.collection, id, {
      order_status: WaterOrderStatus.Cancelled,
      updated_by: dto.updated_by,
    });
    this.recordOrderStatusAudit(order.id, dto.updated_by, dto.actor_role, 'cancel', before, order, dto.reason);
    this.businessEvents.create({
      eventType: WaterBusinessEventType.OrderCancelled,
      aggregateType: 'water_order',
      aggregateId: order.id,
      payload: order,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.OrderCancelled}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.updated_by,
    });
    return order;
  }

  private recordOrderStatusAudit(
    orderId: string,
    actorId: string | undefined,
    actorRole: WaterRole | undefined,
    action: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    reason?: string,
  ) {
    const auditAction =
      action === 'assign'
        ? WaterAuditAction.AssignOrder
        : action === 'deliver'
          ? WaterAuditAction.DeliverOrder
          : WaterAuditAction.CancelOrder;
    this.auditLogs.record({
      actorId,
      actorRole,
      action: auditAction,
      targetType: 'water_order',
      targetId: orderId,
      before,
      after,
      reason,
      metadata: { action },
    });
  }
}
