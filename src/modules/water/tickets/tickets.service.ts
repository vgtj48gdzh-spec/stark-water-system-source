import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { requireIdempotencyKey, WaterErrorCode, waterBadRequest } from '../common/water-api-error';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import {
  WaterAuditAction,
  WaterBusinessEventType,
  WaterTicketTransactionType,
} from '../common/water.enums';
import { RefundTicketDto, SellTicketDto, UseTicketDto } from './dto/ticket-action.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return {
      tickets: this.store.list('tickets'),
      transactions: this.store.list('ticket_transactions'),
      balances: this.getAllTicketBalances(),
    };
  }

  sell(dto: SellTicketDto) {
    return this.sellTicket(dto);
  }

  sellTicket(dto: SellTicketDto) {
    requireIdempotencyKey(dto.idempotency_key);
    const { record: ticket, created } = this.store.createIdempotent('tickets', dto.idempotency_key, {
      customer_id: dto.customer_id,
      ticket_batch_no: `WT-${randomUUID().slice(0, 8)}`,
      total_quantity: dto.quantity,
      remaining_quantity: dto.quantity,
      unit_price: dto.unit_price,
      expires_at: dto.expires_at ?? null,
      created_by: dto.created_by,
    });
    if (!created) {
      return { ticket, transaction: this.findTransactionByIdempotency(dto.idempotency_key), balance: this.getTicketBalance(ticket.id) };
    }

    const transaction = this.createTransaction({
      ticket_id: ticket.id,
      customer_id: dto.customer_id,
      transaction_type: WaterTicketTransactionType.Sold,
      quantity: dto.quantity,
      created_by: dto.created_by,
      idempotency_key: dto.idempotency_key ? `ticket-sold:${dto.idempotency_key}` : undefined,
      actor_role: dto.actor_role,
    });
    const balance = this.refreshTicketBalance(ticket.id);
    this.businessEvents.create({
      eventType: WaterBusinessEventType.TicketSold,
      aggregateType: 'water_ticket',
      aggregateId: ticket.id,
      payload: { ticket, transaction },
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.TicketSold}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return { ticket: this.store.get('tickets', ticket.id), transaction, balance };
  }

  use(dto: UseTicketDto) {
    return this.useTicket(dto);
  }

  useTicket(dto: UseTicketDto) {
    requireIdempotencyKey(dto.idempotency_key);
    const existing = this.findTransactionByIdempotency(dto.idempotency_key);
    if (existing) {
      return { transaction: existing, balance: this.getTicketBalance(String(existing.ticket_id ?? '')) };
    }

    const ticket = this.resolveTicketForDebit(dto.customer_id, dto.ticket_id, dto.quantity);
    const transaction = this.createTransaction({
      ticket_id: ticket.id,
      customer_id: dto.customer_id,
      transaction_type: WaterTicketTransactionType.Used,
      quantity: dto.quantity,
      related_order_id: dto.related_order_id ?? null,
      created_by: dto.created_by,
      idempotency_key: dto.idempotency_key,
      actor_role: dto.actor_role,
    });
    const balance = this.refreshTicketBalance(ticket.id);
    this.businessEvents.create({
      eventType: WaterBusinessEventType.TicketUsed,
      aggregateType: 'water_ticket_transaction',
      aggregateId: transaction.id,
      payload: transaction,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.TicketUsed}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return { transaction, balance };
  }

  refund(dto: RefundTicketDto) {
    return this.refundTicket(dto);
  }

  refundTicket(dto: RefundTicketDto) {
    requireIdempotencyKey(dto.idempotency_key);
    const existing = this.findTransactionByIdempotency(dto.idempotency_key);
    if (existing) {
      return { transaction: existing, balance: this.getTicketBalance(String(existing.ticket_id ?? '')) };
    }

    const ticket = this.resolveTicketForDebit(dto.customer_id, dto.ticket_id, dto.quantity);
    const transaction = this.createTransaction({
      ticket_id: ticket.id,
      customer_id: dto.customer_id,
      transaction_type: WaterTicketTransactionType.Refunded,
      quantity: dto.quantity,
      related_order_id: dto.related_order_id ?? null,
      created_by: dto.created_by,
      idempotency_key: dto.idempotency_key,
      actor_role: dto.actor_role,
    });
    const balance = this.refreshTicketBalance(ticket.id);
    this.businessEvents.create({
      eventType: WaterBusinessEventType.TicketRefunded,
      aggregateType: 'water_ticket_transaction',
      aggregateId: transaction.id,
      payload: transaction,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.TicketRefunded}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return { transaction, balance };
  }

  private createTransaction(input: Record<string, unknown>) {
    const { record: transaction, created } = this.store.createIdempotent(
      'ticket_transactions',
      String(input.idempotency_key ?? '') || undefined,
      input,
    );
    if (!created) {
      return transaction;
    }

    const action =
      input.transaction_type === WaterTicketTransactionType.Sold
        ? WaterAuditAction.SellTicket
        : input.transaction_type === WaterTicketTransactionType.Used
          ? WaterAuditAction.UseTicket
          : WaterAuditAction.RefundTicket;
    this.auditLogs.record({
      actorId: String(input.created_by ?? 'system'),
      actorRole: input.actor_role as any,
      action,
      targetType: 'water_ticket_transaction',
      targetId: transaction.id,
      after: transaction,
      metadata: {
        transaction_type: input.transaction_type,
        customer_id: input.customer_id,
      },
    });
    return transaction;
  }

  getTicketBalance(ticketId: string): number {
    if (!ticketId) {
      return 0;
    }

    return this.store
      .listByField('ticket_transactions', 'ticket_id', ticketId)
      .reduce((balance, transaction) => balance + this.ticketTransactionDelta(transaction), 0);
  }

  getCustomerTicketBalance(customerId: string): number {
    return this.store
      .listByField('ticket_transactions', 'customer_id', customerId)
      .reduce((balance, transaction) => balance + this.ticketTransactionDelta(transaction), 0);
  }

  private getAllTicketBalances() {
    return this.store.list('tickets').map((ticket) => ({
      ticket_id: ticket.id,
      customer_id: ticket.customer_id,
      balance: this.getTicketBalance(ticket.id),
    }));
  }

  private refreshTicketBalance(ticketId: string): number {
    const balance = this.getTicketBalance(ticketId);
    this.store.update('tickets', ticketId, { remaining_quantity: balance });
    return balance;
  }

  private resolveTicketForDebit(customerId: string, ticketId: string | undefined, quantity: number) {
    const candidates = ticketId
      ? [this.store.get('tickets', ticketId)]
      : this.store
          .listByField('tickets', 'customer_id', customerId)
          .filter((ticket) => this.getTicketBalance(ticket.id) > 0);

    const ticket = candidates.find((candidate) => this.getTicketBalance(candidate.id) >= quantity);
    if (!ticket) {
      throw waterBadRequest(WaterErrorCode.TicketInsufficientBalance, 'water ticket balance is insufficient', {
        customer_id: customerId,
        ticket_id: ticketId,
        quantity,
      });
    }

    return ticket;
  }

  private findTransactionByIdempotency(idempotencyKey: string | undefined) {
    if (!idempotencyKey) {
      return undefined;
    }

    return (
      this.store.findByField('ticket_transactions', 'idempotency_key', idempotencyKey) ??
      this.store.findByField('ticket_transactions', 'idempotency_key', `ticket-sold:${idempotencyKey}`)
    );
  }

  private ticketTransactionDelta(transaction: Record<string, unknown>): number {
    const quantity = Number(transaction.quantity ?? 0);
    switch (transaction.transaction_type) {
      case WaterTicketTransactionType.Sold:
      case WaterTicketTransactionType.Adjusted:
      case WaterTicketTransactionType.Transferred:
        return quantity;
      case WaterTicketTransactionType.Used:
      case WaterTicketTransactionType.Refunded:
      case WaterTicketTransactionType.Expired:
        return -quantity;
      default:
        return 0;
    }
  }
}
