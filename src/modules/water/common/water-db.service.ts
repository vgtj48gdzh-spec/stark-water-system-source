import { Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { EntityManager, EntityTarget } from 'typeorm';
import dataSource from '../../../database/data-source';
import {
  WaterAgentInventoryEntity,
  WaterAuditLogEntity,
  WaterBarrelEntity,
  WaterBarrelMovementEntity,
  WaterBusinessEventEntity,
  WaterCustomerAddressEntity,
  WaterCustomerEntity,
  WaterAgentEntity,
  WaterInventoryMovementEntity,
  WaterOrderEntity,
  WaterRegionEntity,
  WaterServicePointEntity,
  WaterTicketEntity,
  WaterTicketTransactionEntity,
} from '../water.entities';
import { canRevealCustomerPhone } from '../auth/water-permissions';
import { normalizePhoneNumber, maskPhoneNumber } from './phone-mask.util';
import { WaterErrorCode, waterBadRequest, waterConflict, waterForbidden, waterNotFound } from './water-api-error';
import {
  WaterAuditAction,
  WaterBarrelStatus,
  WaterBusinessEventType,
  WaterDeliveryStatus,
  WaterInventoryMovementType,
  WaterOrderStatus,
  WaterPaymentStatus,
  WaterRole,
  WaterSyncStatus,
  WaterTicketPaymentMethod,
  WaterTicketStatus,
  WaterTicketTransactionType,
} from './water.enums';

type ApiRecord = Record<string, unknown> & { id: string };

@Injectable()
export class WaterDbService {
  private initFailed = false;

  async listCustomers(masked = true): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const customers = await manager.find(WaterCustomerEntity, { order: { createdAt: 'DESC' } });
    return Promise.all(customers.map((customer) => buildCustomerSummary(manager, customer, masked)));
  }

  async getCustomer(id: string, masked = true): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const customer = await manager.findOneBy(WaterCustomerEntity, { id });
    return customer ? buildCustomerSummary(manager, customer, masked) : null;
  }

  async getCustomerDetail(id: string): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const customer = await manager.findOneBy(WaterCustomerEntity, { id });
    if (!customer) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: id });

    const addresses = await buildAddressViews(
      manager,
      await manager.find(WaterCustomerAddressEntity, {
        where: { customerId: id },
        order: { isDefault: 'DESC', createdAt: 'ASC' },
      }),
      true,
    );
    const recentOrders = (
      await manager.find(WaterOrderEntity, {
        where: { customerId: id },
        order: { createdAt: 'DESC' },
        take: 10,
      })
    ).map(toApiRecord);
    const tickets: ApiRecord[] = [];
    for (const ticket of await manager.find(WaterTicketEntity, { where: { customerId: id }, order: { createdAt: 'DESC' } })) {
      tickets.push(await buildTicketView(manager, ticket));
    }
    const barrels = (
      await manager.find(WaterBarrelEntity, {
        where: { currentHolderType: 'CUSTOMER', currentHolderId: id },
        order: { updatedAt: 'DESC' },
      })
    ).map(toApiRecord);
    const addressIds = new Set(addresses.map((address) => String(address.id)));
    const auditLogs = (
      await manager.find(WaterAuditLogEntity, {
        order: { createdAt: 'DESC' },
        take: 200,
      })
    )
      .filter(
        (log) =>
          log.targetId === id ||
          (log.targetType === 'water_customer_address' && log.targetId && addressIds.has(log.targetId)) ||
          (log.targetType === 'customer_address' && log.targetId && addressIds.has(log.targetId)),
      )
      .slice(0, 20)
      .map(toApiRecord);

    return {
      ...(await buildCustomerSummary(manager, customer, true)),
      addresses,
      recent_orders: recentOrders,
      tickets,
      barrels,
      audit_logs: auditLogs,
    };
  }

  maskCustomerRecords(records: ApiRecord[]): ApiRecord[] {
    return records.map((record) => {
      const phone = String(record.phone ?? '');
      const display = maskPhoneNumber(phone, { role: WaterRole.Admin, hasExplicitGrant: false });
      return {
        ...record,
        phone: display,
        normalized_phone: null,
        phone_display: display,
      } as ApiRecord;
    });
  }

  async revealCustomerPhone(
    id: string,
    input: { actor_id?: string | null; actor_role?: WaterRole | string | null; reason?: string | null },
  ): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    if (!canRevealCustomerPhone(input.actor_role ?? undefined)) {
      throw waterForbidden(WaterErrorCode.PermissionDenied, 'current role cannot reveal full customer phone', {
        actor_role: input.actor_role,
      });
    }
    const customer = await manager.findOneBy(WaterCustomerEntity, { id });
    if (!customer) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: id });
    await saveAudit(manager, {
      action: WaterAuditAction.CustomerPhoneRevealed,
      actorId: input.actor_id,
      actorRole: input.actor_role as WaterRole,
      targetType: 'customer',
      targetId: customer.id,
      after: {
        customer_id: customer.id,
        phone_last4: customer.phone.slice(-4),
        revealed: true,
      },
      reason: input.reason,
      key: apiKey('audit_customer_phone_revealed', customer.id, input.actor_id, Date.now()),
    });
    return {
      id: customer.id,
      customer_id: customer.id,
      customer_name: customer.customerName,
      phone: customer.phone,
      phone_display: customer.phone,
      reason: input.reason ?? null,
      revealed_at: new Date().toISOString(),
    };
  }

  async createCustomer(dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const normalizedPhone = normalizePhoneNumber(dto.phone);
    const explicitIdempotencyKey = dto.idempotency_key;
    const idempotencyKey = explicitIdempotencyKey ?? apiKey('customer', normalizedPhone);
    const existingByIdempotency = explicitIdempotencyKey
      ? await findByIdempotency(manager, WaterCustomerEntity, explicitIdempotencyKey)
      : null;
    if (existingByIdempotency) return toApiRecord(existingByIdempotency);

    const existingByPhone = await manager.findOneBy(WaterCustomerEntity, { normalizedPhone });
    if (existingByPhone) {
      const existingCustomer = await buildCustomerSummary(manager, existingByPhone, true);
      throw waterConflict(WaterErrorCode.CustomerPhoneExists, 'customer phone already exists', {
        existing_customer: {
          id: existingCustomer.id,
          customer_id: existingCustomer.id,
          customer_name: existingCustomer.customer_name,
          phone_display: existingCustomer.phone_display,
          address_count: existingCustomer.address_count,
          recent_order_at: existingCustomer.recent_order_at,
          default_address: existingCustomer.default_address,
        },
      });
    }

    return manager.transaction(async (tx) => {
      const customer = await tx.save(WaterCustomerEntity, {
        ...baseRecord('api_customer', dto.created_by, dto.region_id, idempotencyKey),
        customerName: dto.customer_name ?? dto.name ?? `Customer ${normalizedPhone}`,
        phone: normalizedPhone,
        normalizedPhone,
        customerType: dto.customer_type ?? 'HOUSEHOLD',
        agentId: dto.agent_id ?? null,
        servicePointId: dto.service_point_id ?? null,
        remark: dto.remark ?? null,
      });
      await saveAudit(tx, {
        action: WaterAuditAction.CreateCustomer,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        targetType: 'water_customer',
        targetId: customer.id,
        after: toApiRecord(customer),
        key: `${idempotencyKey}:audit`,
      });
      await saveEvent(tx, {
        type: WaterBusinessEventType.CustomerCreated,
        aggregateType: 'water_customer',
        aggregateId: customer.id,
        payload: toApiRecord(customer),
        actorId: dto.created_by,
        key: `${idempotencyKey}:event`,
      });
      return toApiRecord(customer);
    });
  }

  async updateCustomer(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const before = await manager.findOneBy(WaterCustomerEntity, { id });
    if (!before) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: id });
    const patch: Partial<WaterCustomerEntity> = {
      customerName: dto.customer_name ?? before.customerName,
      phone: dto.phone ? normalizePhoneNumber(dto.phone) : before.phone,
      normalizedPhone: dto.phone ? normalizePhoneNumber(dto.phone) : before.normalizedPhone,
      defaultAddressId: dto.default_address_id ?? before.defaultAddressId,
      agentId: dto.agent_id ?? before.agentId,
      servicePointId: dto.service_point_id ?? before.servicePointId,
      updatedBy: dto.updated_by,
      remark: dto.remark ?? before.remark,
    };
    await manager.update(WaterCustomerEntity, id, patch);
    const after = await manager.findOneByOrFail(WaterCustomerEntity, { id });
    await saveAudit(manager, {
      action: WaterAuditAction.UpdateCustomer,
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      targetType: 'water_customer',
      targetId: id,
      before: toApiRecord(before),
      after: toApiRecord(after),
      reason: dto.reason,
      key: apiKey('audit_customer_update', id, Date.now()),
    });
    await saveEvent(manager, {
      type: WaterBusinessEventType.CustomerUpdated,
      aggregateType: 'water_customer',
      aggregateId: id,
      payload: toApiRecord(after),
      actorId: dto.updated_by,
      key: apiKey('event_customer_update', id, Date.now()),
    });
    return toApiRecord(after);
  }

  async listAddresses(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return buildAddressViews(
      manager,
      await manager.find(WaterCustomerAddressEntity, { order: { createdAt: 'DESC' } }),
      true,
    );
  }

  async listRegions(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterRegionEntity, { order: { createdAt: 'DESC' } })).map(toApiRecord);
  }

  async listAgents(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterAgentEntity, { order: { createdAt: 'DESC' } })).map(toApiRecord);
  }

  async listServicePoints(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterServicePointEntity, { order: { createdAt: 'DESC' } })).map(toApiRecord);
  }

  async listCustomerAddresses(customerId: string): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const customer = await manager.findOneBy(WaterCustomerEntity, { id: customerId });
    if (!customer) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: customerId });
    return buildAddressViews(
      manager,
      await manager.find(WaterCustomerAddressEntity, {
        where: { customerId },
        order: { isDefault: 'DESC', createdAt: 'ASC' },
      }),
      true,
    );
  }

  async createAddress(customerId: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const idempotencyKey = dto.idempotency_key ?? apiKey('address', customerId, dto.address_line);
    const existing = await findByIdempotency(manager, WaterCustomerAddressEntity, idempotencyKey);
    if (existing) return toApiRecord(existing);

    return manager.transaction(async (tx) => {
      const customer = await tx.findOneBy(WaterCustomerEntity, { id: customerId });
      if (!customer) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: customerId });
      const existingAddressCount = await tx.count(WaterCustomerAddressEntity, { where: { customerId } });
      const contactPhone = normalizePhoneNumber(dto.contact_phone || customer.phone);
      const wantsDefault = Boolean(dto.is_default) || existingAddressCount === 0 || !customer.defaultAddressId;
      if (wantsDefault) {
        await tx.update(WaterCustomerAddressEntity, { customerId }, { isDefault: false });
      }
      const address = await tx.save(WaterCustomerAddressEntity, {
        ...baseRecord('api_address', dto.created_by, dto.region_id ?? customer.regionId, idempotencyKey),
        customerId,
        contactName: dto.contact_name ?? customer.customerName,
        contactPhone,
        normalizedContactPhone: contactPhone,
        addressLabel: dto.address_label ?? '家庭',
        province: dto.province ?? null,
        city: dto.city ?? null,
        district: dto.district ?? null,
        addressLine: dto.address_line,
        servicePointId: dto.service_point_id ?? customer.servicePointId ?? null,
        addressStatus: dto.address_status ?? 'ACTIVE',
        isDefault: wantsDefault,
      });
      if (address.isDefault) {
        await tx.update(WaterCustomerEntity, customer.id, { defaultAddressId: address.id, updatedBy: dto.created_by });
      }
      await saveAudit(tx, {
        action: WaterAuditAction.CreateAddress,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        targetType: 'water_customer_address',
        targetId: address.id,
        after: toApiRecord(address),
        key: `${idempotencyKey}:audit`,
      });
      return buildAddressView(tx, address, true);
    });
  }

  async updateAddress(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const before = await manager.findOneBy(WaterCustomerAddressEntity, { id });
    if (!before) throw waterNotFound(WaterErrorCode.AddressNotFound, 'address not found', { address_id: id });
    const contactPhone = dto.contact_phone ? normalizePhoneNumber(dto.contact_phone) : before.contactPhone;
    const after = await manager.transaction(async (tx) => {
      if (dto.is_default === true) {
        await tx.update(WaterCustomerAddressEntity, { customerId: before.customerId }, { isDefault: false });
        await tx.update(WaterCustomerEntity, before.customerId, { defaultAddressId: id, updatedBy: dto.updated_by });
      }
      await tx.update(WaterCustomerAddressEntity, id, {
        contactName: dto.contact_name ?? before.contactName,
        contactPhone,
        normalizedContactPhone: contactPhone,
        addressLabel: dto.address_label ?? before.addressLabel,
        province: dto.province ?? before.province,
        city: dto.city ?? before.city,
        district: dto.district ?? before.district,
        addressLine: dto.address_line ?? before.addressLine,
        servicePointId: dto.service_point_id ?? before.servicePointId,
        addressStatus: dto.address_status ?? before.addressStatus,
        isDefault: dto.is_default ?? before.isDefault,
        updatedBy: dto.updated_by,
      });
      return tx.findOneByOrFail(WaterCustomerAddressEntity, { id });
    });
    await saveAudit(manager, {
      action: WaterAuditAction.UpdateAddress,
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      targetType: 'water_customer_address',
      targetId: id,
      before: toApiRecord(before),
      after: toApiRecord(after),
      reason: dto.reason,
      key: apiKey('audit_address_update', id, Date.now()),
    });
    return buildAddressView(manager, after, true);
  }

  async setDefaultAddress(
    id: string,
    input: { actor_id?: string | null; actor_role?: WaterRole | string | null; reason?: string | null },
  ): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const before = await manager.findOneBy(WaterCustomerAddressEntity, { id });
    if (!before) throw waterNotFound(WaterErrorCode.AddressNotFound, 'address not found', { address_id: id });
    const after = await manager.transaction(async (tx) => {
      await tx.update(WaterCustomerAddressEntity, { customerId: before.customerId }, { isDefault: false });
      await tx.update(WaterCustomerAddressEntity, id, { isDefault: true, updatedBy: input.actor_id ?? 'admin' });
      await tx.update(WaterCustomerEntity, before.customerId, {
        defaultAddressId: id,
        updatedBy: input.actor_id ?? 'admin',
      });
      return tx.findOneByOrFail(WaterCustomerAddressEntity, { id });
    });
    await saveAudit(manager, {
      action: WaterAuditAction.UpdateAddress,
      actorId: input.actor_id,
      actorRole: input.actor_role as WaterRole,
      targetType: 'water_customer_address',
      targetId: id,
      before: toApiRecord(before),
      after: toApiRecord(after),
      reason: input.reason ?? 'set_default_address',
      key: apiKey('audit_address_set_default', id, input.actor_id, Date.now()),
    });
    return buildAddressView(manager, after, true);
  }

  async revealCustomerAddressPhone(
    id: string,
    input: { actor_id?: string | null; actor_role?: WaterRole | string | null; reason?: string | null },
  ): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    if (!canRevealCustomerPhone(input.actor_role ?? undefined)) {
      throw waterForbidden(WaterErrorCode.PermissionDenied, 'current role cannot reveal full address phone', {
        actor_role: input.actor_role,
      });
    }
    const address = await manager.findOneBy(WaterCustomerAddressEntity, { id });
    if (!address) throw waterNotFound(WaterErrorCode.AddressNotFound, 'address not found', { address_id: id });
    await saveAudit(manager, {
      action: WaterAuditAction.CustomerAddressPhoneRevealed,
      actorId: input.actor_id,
      actorRole: input.actor_role as WaterRole,
      targetType: 'customer_address',
      targetId: address.id,
      after: {
        customer_id: address.customerId,
        address_id: address.id,
        phone_last4: address.contactPhone.slice(-4),
        revealed: true,
      },
      reason: input.reason,
      key: apiKey('audit_customer_address_phone_revealed', address.id, input.actor_id, Date.now()),
    });
    return {
      ...(await buildAddressView(manager, address, false)),
      contact_phone: address.contactPhone,
      phone_display: address.contactPhone,
      reason: input.reason ?? null,
      revealed_at: new Date().toISOString(),
    };
  }

  async listOrders(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return Promise.all(
      (await manager.find(WaterOrderEntity, { order: { createdAt: 'DESC' } })).map((order) => buildOrderSummary(manager, order)),
    );
  }

  async createOrder(dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const idempotencyKey = dto.idempotency_key;
    const existing = await findByIdempotency(manager, WaterOrderEntity, idempotencyKey);
    if (existing) return toApiRecord(existing);

    return manager.transaction(async (tx) => {
      const customer = await tx.findOneBy(WaterCustomerEntity, { id: dto.customer_id });
      if (!customer) throw waterNotFound(WaterErrorCode.CustomerNotFound, 'customer not found', { customer_id: dto.customer_id });
      const address = await tx.findOneBy(WaterCustomerAddressEntity, { id: dto.address_id });
      if (!address || address.customerId !== dto.customer_id) {
        throw waterNotFound(WaterErrorCode.AddressNotFound, 'address not found for customer', {
          customer_id: dto.customer_id,
          address_id: dto.address_id,
        });
      }
      if (address.addressStatus === 'INACTIVE') {
        throw waterConflict(WaterErrorCode.AddressNotFound, 'address is inactive and cannot be used for new orders', {
          address_id: address.id,
        });
      }
      const order = await tx.save(WaterOrderEntity, {
        ...baseRecord('api_order', dto.created_by, dto.region_id ?? address.regionId ?? customer.regionId, idempotencyKey),
        customerId: dto.customer_id,
        addressId: address.id,
        orderStatus: WaterOrderStatus.Submitted,
        paymentStatus: dto.payment_status ?? WaterPaymentStatus.Unpaid,
        deliveryStatus: WaterDeliveryStatus.Pending,
        agentId: dto.agent_id ?? customer.agentId ?? null,
        servicePointId: dto.service_point_id ?? address.servicePointId ?? customer.servicePointId ?? null,
        deliveryStaffId: dto.delivery_staff_id ?? null,
        ticketQuantityToUse: Number(dto.ticket_quantity_to_use ?? 0),
        barrelQuantityToReturn: Number(dto.barrel_quantity_to_return ?? dto.quantity ?? 1),
        totalAmount: String(dto.total_amount ?? '0.00'),
      });
      await saveAudit(tx, {
        action: WaterAuditAction.CreateOrder,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        targetType: 'water_order',
        targetId: order.id,
        after: toApiRecord(order),
        key: `${idempotencyKey}:audit`,
      });
      await saveEvent(tx, {
        type: WaterBusinessEventType.OrderCreated,
        aggregateType: 'water_order',
        aggregateId: order.id,
        payload: toApiRecord(order),
        actorId: dto.created_by,
        key: `${idempotencyKey}:event`,
      });
      return toApiRecord(order);
    });
  }

  async assignOrder(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const before = await manager.findOneBy(WaterOrderEntity, { id });
    if (!before) throw waterNotFound(WaterErrorCode.OrderNotFound, 'order not found', { order_id: id });
    if ([WaterOrderStatus.Cancelled, WaterOrderStatus.Delivered].includes(before.orderStatus)) {
      throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'order cannot be assigned from current status', {
        order_id: id,
        order_status: before.orderStatus,
      });
    }
    await manager.update(WaterOrderEntity, id, {
      agentId: dto.agent_id ?? before.agentId,
      servicePointId: dto.service_point_id ?? before.servicePointId,
      deliveryStaffId: dto.delivery_staff_id ?? before.deliveryStaffId,
      orderStatus: WaterOrderStatus.Assigned,
      deliveryStatus: WaterDeliveryStatus.Assigned,
      updatedBy: dto.updated_by,
    });
    const after = await manager.findOneByOrFail(WaterOrderEntity, { id });
    await saveAudit(manager, {
      action: WaterAuditAction.AssignOrder,
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      targetType: 'water_order',
      targetId: id,
      before: toApiRecord(before),
      after: toApiRecord(after),
      reason: dto.reason,
      key: apiKey('audit_order_assign', id, dto.updated_by, Date.now()),
    });
    return toApiRecord(after);
  }

  async deliverOrder(id: string, dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => deliverOrderInDb(tx, id, dto));
  }

  async cancelOrder(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const before = await manager.findOneBy(WaterOrderEntity, { id });
    if (!before) throw waterNotFound(WaterErrorCode.OrderNotFound, 'order not found', { order_id: id });
    if (before.orderStatus === WaterOrderStatus.Delivered) {
      throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'delivered order cannot be directly cancelled in V0', {
        order_id: id,
      });
    }
    if (before.orderStatus === WaterOrderStatus.Cancelled) return toApiRecord(before);
    await manager.update(WaterOrderEntity, id, {
      orderStatus: WaterOrderStatus.Cancelled,
      deliveryStatus: WaterDeliveryStatus.Failed,
      updatedBy: dto.updated_by,
    });
    const after = await manager.findOneByOrFail(WaterOrderEntity, { id });
    await saveAudit(manager, {
      action: WaterAuditAction.CancelOrder,
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      targetType: 'water_order',
      targetId: id,
      before: toApiRecord(before),
      after: toApiRecord(after),
      reason: dto.reason,
      key: apiKey('audit_order_cancel', id, dto.idempotency_key ?? Date.now()),
    });
    await saveEvent(manager, {
      type: WaterBusinessEventType.OrderCancelled,
      aggregateType: 'water_order',
      aggregateId: id,
      payload: toApiRecord(after),
      actorId: dto.updated_by,
      key: apiKey('event_order_cancel', id, dto.idempotency_key ?? Date.now()),
    });
    return toApiRecord(after);
  }

  async listTickets(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const tickets = await manager.find(WaterTicketEntity, { order: { createdAt: 'DESC' } });
    return Promise.all(tickets.map((ticket) => buildTicketView(manager, ticket)));
  }

  async sellTicket(dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const idempotencyKey = dto.idempotency_key;
    const existingTicket = await findByIdempotency(manager, WaterTicketEntity, idempotencyKey);
    if (existingTicket) {
      const transaction = await manager.findOne(WaterTicketTransactionEntity, {
        where: { ticketId: existingTicket.id, transactionType: WaterTicketTransactionType.Sold } as any,
      });
      return {
        ticket: await buildTicketView(manager, existingTicket),
        transaction: transaction ? toApiRecord(transaction) : null,
        balance: isTicketEffective(existingTicket) ? await getTicketBalance(manager, existingTicket.id) : 0,
      };
    }
    const existing = await findByIdempotency(manager, WaterTicketTransactionEntity, `${idempotencyKey}:tx`);
    if (existing) {
      const ticket = existing.ticketId ? await manager.findOneBy(WaterTicketEntity, { id: existing.ticketId }) : null;
      return { ticket: ticket ? await buildTicketView(manager, ticket) : null, transaction: toApiRecord(existing) };
    }
    return manager.transaction(async (tx) => sellTicketInDb(tx, dto));
  }

  async confirmTicketPayment(id: string, dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => confirmTicketPaymentInDb(tx, id, dto));
  }

  async cancelTicketPurchase(id: string, dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => cancelTicketPurchaseInDb(tx, id, dto));
  }

  async useTicket(dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => useTicketInDb(tx, dto));
  }

  async refundTicket(dto: any): Promise<Record<string, unknown> | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => refundTicketInDb(tx, dto));
  }

  async listInventoryBalances(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const movements = await manager.find(WaterInventoryMovementEntity, { order: { createdAt: 'ASC' } });
    const balances = computeInventoryBalances(movements);
    return Promise.all(balances.map((balance) => buildInventoryBalanceView(manager, balance)));
  }

  async listInventoryMovements(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const movements = await manager.find(WaterInventoryMovementEntity, { order: { createdAt: 'DESC' } });
    return Promise.all(movements.map((movement) => buildInventoryMovementView(manager, movement)));
  }

  async createInventoryMovement(dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) => createInventoryMovementInDb(tx, dto));
  }

  async listBarrels(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterBarrelEntity, { order: { createdAt: 'DESC' } })).map(toApiRecord);
  }

  async createBarrel(dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const idempotencyKey = dto.idempotency_key ?? apiKey('barrel', dto.barrel_code);
    const existing = await manager.findOneBy(WaterBarrelEntity, { barrelCode: dto.barrel_code });
    if (existing) return toApiRecord(existing);
    const barrel = await manager.save(WaterBarrelEntity, {
      ...baseRecord('api_barrel', dto.created_by, dto.region_id, idempotencyKey),
      barrelCode: dto.barrel_code,
      qrCode: dto.qr_code ?? null,
      rfidCode: dto.rfid_code ?? null,
      barrelStatus: dto.barrel_status ?? dto.status ?? WaterBarrelStatus.ServicePointStock,
      currentHolderType: dto.current_holder_type ?? 'SERVICE_POINT',
      currentHolderId: dto.current_holder_id ?? null,
    });
    await saveAudit(manager, {
      action: WaterAuditAction.CreateBarrel,
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      targetType: 'water_barrel',
      targetId: barrel.id,
      after: toApiRecord(barrel),
      key: `${idempotencyKey}:audit`,
    });
    return toApiRecord(barrel);
  }

  async listBarrelMovements(barrelId: string): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterBarrelMovementEntity, { where: { barrelId }, order: { createdAt: 'DESC' } })).map(
      toApiRecord,
    );
  }

  async moveBarrel(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) =>
      moveBarrelInDb(tx, id, {
        movementType: dto.movement_type ?? 'MOVED',
        toHolderType: dto.to_holder_type,
        toHolderId: dto.to_holder_id,
        nextStatus: dto.next_status,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        reason: dto.reason,
        idempotencyKey: dto.idempotency_key,
      }),
    );
  }

  async returnBarrel(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return manager.transaction(async (tx) =>
      moveBarrelInDb(tx, id, {
        movementType: 'RETURNED',
        toHolderType: dto.to_holder_type ?? 'SERVICE_POINT',
        toHolderId: dto.to_holder_id,
        nextStatus: WaterBarrelStatus.ServicePointStock,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        reason: dto.reason,
        idempotencyKey: dto.idempotency_key,
      }),
    );
  }

  async markBarrelLostOrDamaged(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const status = dto.status === WaterBarrelStatus.Damaged ? WaterBarrelStatus.Damaged : WaterBarrelStatus.Lost;
    return manager.transaction(async (tx) =>
      moveBarrelInDb(tx, id, {
        movementType: status === WaterBarrelStatus.Damaged ? 'DAMAGED' : 'LOST',
        toHolderType: null,
        toHolderId: null,
        nextStatus: status,
        actorId: dto.created_by,
        actorRole: dto.actor_role,
        reason: dto.reason,
        idempotencyKey: dto.idempotency_key,
      }),
    );
  }

  async listBusinessEvents(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const events = await manager.find(WaterBusinessEventEntity, { order: { createdAt: 'DESC' } });
    return Promise.all(events.map((event) => buildBusinessEventView(manager, event)));
  }

  async acknowledgeBusinessEvent(id: string, dto: any): Promise<ApiRecord | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    const event = await manager.findOneBy(WaterBusinessEventEntity, { id });
    if (!event) throw waterNotFound(WaterErrorCode.InternalError, 'business event not found', { event_id: id });
    if (event.syncStatus !== WaterSyncStatus.Synced) {
      await manager.update(WaterBusinessEventEntity, id, {
        syncStatus: WaterSyncStatus.Synced,
        syncAttempts: Number(event.syncAttempts ?? 0) + 1,
        updatedBy: dto.updated_by,
      });
    }
    return toApiRecord(await manager.findOneByOrFail(WaterBusinessEventEntity, { id }));
  }

  async listAuditLogs(): Promise<ApiRecord[] | null> {
    const manager = await this.tryManager();
    if (!manager) return null;
    return (await manager.find(WaterAuditLogEntity, { order: { createdAt: 'DESC' } })).map(toApiRecord);
  }

  private async tryManager(): Promise<EntityManager | null> {
    if (process.env.WATER_API_STORE === 'mock' || this.initFailed) {
      return null;
    }

    if (dataSource.isInitialized) {
      return dataSource.manager;
    }

    try {
      await dataSource.initialize();
      return dataSource.manager;
    } catch {
      this.initFailed = true;
      return null;
    }
  }
}

export async function deliverOrderInDb(manager: EntityManager, orderId: string, dto: any) {
  const before = await manager.findOneBy(WaterOrderEntity, { id: orderId });
  if (!before) throw waterNotFound(WaterErrorCode.OrderNotFound, 'order not found', { order_id: orderId });
  if (before.orderStatus === WaterOrderStatus.Cancelled) {
    throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'cancelled order cannot be delivered', { order_id: orderId });
  }
  if (before.orderStatus === WaterOrderStatus.Delivered) {
    return { order: toApiRecord(before), ticketResult: null, inventoryMovement: null, barrelMovement: null };
  }

  await manager.update(WaterOrderEntity, orderId, {
    orderStatus: WaterOrderStatus.Delivered,
    deliveryStatus: WaterDeliveryStatus.Delivered,
    updatedBy: dto.updated_by,
  });
  const order = await manager.findOneByOrFail(WaterOrderEntity, { id: orderId });
  await saveAudit(manager, {
    action: WaterAuditAction.DeliverOrder,
    actorId: dto.updated_by,
    actorRole: dto.actor_role,
    targetType: 'water_order',
    targetId: orderId,
    before: toApiRecord(before),
    after: toApiRecord(order),
    reason: dto.reason,
    key: apiKey('audit_order_deliver', orderId, dto.idempotency_key),
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.OrderDelivered,
    aggregateType: 'water_order',
    aggregateId: orderId,
    payload: toApiRecord(order),
    actorId: dto.updated_by,
    key: apiKey('event_order_deliver', orderId, dto.idempotency_key),
  });

  const ticketQuantity = Number(dto.ticket_quantity ?? before.ticketQuantityToUse ?? 0);
  const ticketResult =
    ticketQuantity > 0
      ? await useTicketInDb(manager, {
          customer_id: before.customerId,
          ticket_id: dto.ticket_id,
          quantity: ticketQuantity,
          related_order_id: orderId,
          created_by: dto.updated_by,
          actor_role: dto.actor_role,
          reason: dto.reason,
          idempotency_key: `${dto.idempotency_key}:ticket-use`,
        })
      : null;

  const inventoryQuantity = Number(dto.inventory_quantity ?? ticketQuantity ?? 0);
  const inventoryMovement =
    inventoryQuantity > 0
      ? await createInventoryMovementInDb(manager, {
          movement_type: WaterInventoryMovementType.DeliveryOut,
          agent_id: before.agentId,
          service_point_id: before.servicePointId,
          quantity: inventoryQuantity,
          related_order_id: orderId,
          created_by: dto.updated_by,
          actor_role: dto.actor_role,
          reason: dto.reason ?? 'delivery_completed',
          idempotency_key: `${dto.idempotency_key}:inventory-delivery-out`,
        })
      : null;

  const barrel =
    dto.barrel_id || before.barrelQuantityToReturn > 0
      ? await findDeliveryBarrel(manager, dto.barrel_id, before)
      : null;
  let barrelMovement: ApiRecord | null = null;
  if (barrel) {
    if (barrel.barrelStatus === WaterBarrelStatus.ServicePointStock) {
      await moveBarrelInDb(manager, barrel.id, {
        movementType: 'CHECKED_OUT',
        toHolderType: 'CUSTOMER',
        toHolderId: before.customerId,
        nextStatus: WaterBarrelStatus.AtCustomer,
        actorId: dto.updated_by,
        actorRole: dto.actor_role,
        reason: 'delivery_barrel_checked_out',
        idempotencyKey: `${dto.idempotency_key}:barrel-checkout`,
      });
    }
    barrelMovement = await moveBarrelInDb(manager, barrel.id, {
      movementType: 'RETURNED',
      toHolderType: dto.return_to_holder_type ?? 'SERVICE_POINT',
      toHolderId: dto.return_to_holder_id ?? before.servicePointId ?? before.agentId,
      nextStatus: WaterBarrelStatus.ServicePointStock,
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      reason: dto.reason ?? 'empty_barrel_returned',
      idempotencyKey: `${dto.idempotency_key}:barrel-return`,
    });
  }

  return {
    order: toApiRecord(order),
    ticketResult,
    inventoryMovement,
    barrelMovement,
  };
}

export async function sellTicketInDb(manager: EntityManager, dto: any) {
  const quantity = Number(dto.quantity);
  const amount = Number(dto.amount ?? 0);
  const unitPrice = Number(dto.unit_price ?? (amount / Math.max(quantity, 1))).toFixed(2);
  const isConfirmed =
    dto.payment_status === WaterPaymentStatus.Confirmed ||
    dto.confirm_payment === true ||
    dto.payment_status === undefined;
  const ticket = await manager.save(WaterTicketEntity, {
    ...baseRecord('api_ticket', dto.created_by, dto.region_id, dto.idempotency_key),
    customerId: dto.customer_id,
    ticketBatchNo: dto.ticket_batch_no ?? `TICKET-${Date.now()}`,
    totalQuantity: quantity,
    remainingQuantity: isConfirmed ? quantity : 0,
    unitPrice,
    amount: String(amount || Number(unitPrice) * quantity),
    paymentMethod: dto.payment_method ?? WaterTicketPaymentMethod.OfflineWechat,
    paymentStatus: isConfirmed ? WaterPaymentStatus.Confirmed : WaterPaymentStatus.PendingConfirmation,
    ticketStatus: isConfirmed ? WaterTicketStatus.Active : WaterTicketStatus.PendingEffective,
    confirmedBy: isConfirmed ? (dto.confirmed_by ?? dto.created_by ?? null) : null,
    confirmedAt: isConfirmed ? new Date() : null,
    remark: dto.reason ?? dto.remark ?? null,
  });
  if (!isConfirmed) {
    await saveAudit(manager, {
      action: 'ticket.purchase.created',
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      targetType: 'water_ticket',
      targetId: ticket.id,
      after: toApiRecord(ticket),
      reason: dto.reason ?? '后台创建水票购买单，待确认收款后生效',
      key: `${dto.idempotency_key}:purchase-audit`,
    });
    return { ticket: await buildTicketView(manager, ticket), transaction: null, balance: 0 };
  }
  const transaction = await manager.save(WaterTicketTransactionEntity, {
    ...baseRecord('api_ticket_sold', dto.created_by, dto.region_id, `${dto.idempotency_key}:tx`),
    ticketId: ticket.id,
    customerId: dto.customer_id,
    transactionType: WaterTicketTransactionType.Sold,
    quantity,
  });
  await saveAudit(manager, {
    action: WaterAuditAction.SellTicket,
    actorId: dto.created_by,
    actorRole: dto.actor_role,
    targetType: 'water_ticket_transaction',
    targetId: transaction.id,
    after: toApiRecord(transaction),
    key: `${dto.idempotency_key}:audit`,
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.TicketSold,
    aggregateType: 'water_ticket',
    aggregateId: ticket.id,
    payload: { ticket: toApiRecord(ticket), transaction: toApiRecord(transaction) },
    actorId: dto.created_by,
    key: `${dto.idempotency_key}:event`,
  });
  return { ticket: await buildTicketView(manager, ticket), transaction: toApiRecord(transaction), balance: quantity };
}

export async function confirmTicketPaymentInDb(manager: EntityManager, id: string, dto: any) {
  const ticket = await manager.findOneBy(WaterTicketEntity, { id });
  if (!ticket) throw waterNotFound(WaterErrorCode.TicketNotFound, 'ticket not found', { ticket_id: id });
  if (ticket.paymentStatus === WaterPaymentStatus.Cancelled || ticket.ticketStatus === WaterTicketStatus.Voided) {
    throw waterBadRequest(WaterErrorCode.PaymentStatusInvalid, 'cancelled ticket purchase cannot be confirmed', {
      ticket_id: id,
      payment_status: ticket.paymentStatus,
      ticket_status: ticket.ticketStatus,
    });
  }

  const existingSold =
    (await manager.findOne(WaterTicketTransactionEntity, {
      where: { ticketId: ticket.id, transactionType: WaterTicketTransactionType.Sold } as any,
    })) ?? (await findByIdempotency(manager, WaterTicketTransactionEntity, `${dto.idempotency_key}:tx`));

  const before = toApiRecord(ticket);
  await manager.update(WaterTicketEntity, ticket.id, {
    paymentMethod: dto.payment_method ?? ticket.paymentMethod ?? WaterTicketPaymentMethod.OfflineWechat,
    paymentStatus: WaterPaymentStatus.Confirmed,
    ticketStatus: WaterTicketStatus.Active,
    remainingQuantity: existingSold ? ticket.remainingQuantity : ticket.totalQuantity,
    confirmedBy: dto.confirmed_by ?? dto.created_by ?? ticket.confirmedBy ?? null,
    confirmedAt: ticket.confirmedAt ?? new Date(),
    updatedBy: dto.created_by ?? dto.confirmed_by ?? ticket.updatedBy,
    remark: dto.collection_remark ?? dto.reason ?? ticket.remark ?? null,
  });
  const after = await manager.findOneByOrFail(WaterTicketEntity, { id: ticket.id });
  const transaction =
    existingSold ??
    (await manager.save(WaterTicketTransactionEntity, {
      ...baseRecord('api_ticket_payment_confirmed', dto.created_by, ticket.regionId, `${dto.idempotency_key}:tx`),
      ticketId: ticket.id,
      customerId: ticket.customerId,
      transactionType: WaterTicketTransactionType.Sold,
      quantity: ticket.totalQuantity,
    }));

  await saveAudit(manager, {
    action: WaterAuditAction.ConfirmPayment,
    actorId: dto.created_by ?? dto.confirmed_by,
    actorRole: dto.actor_role,
    targetType: 'water_ticket',
    targetId: ticket.id,
    before,
    after: toApiRecord(after),
    reason: dto.reason,
    key: `${dto.idempotency_key}:audit`,
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.TicketSold,
    aggregateType: 'water_ticket',
    aggregateId: ticket.id,
    payload: { ticket: toApiRecord(after), transaction: toApiRecord(transaction), payment_confirmed: true },
    actorId: dto.created_by ?? dto.confirmed_by,
    key: `${dto.idempotency_key}:event`,
  });

  return { ticket: await buildTicketView(manager, after), transaction: toApiRecord(transaction), balance: await getTicketBalance(manager, ticket.id) };
}

export async function cancelTicketPurchaseInDb(manager: EntityManager, id: string, dto: any) {
  const ticket = await manager.findOneBy(WaterTicketEntity, { id });
  if (!ticket) throw waterNotFound(WaterErrorCode.TicketNotFound, 'ticket not found', { ticket_id: id });
  if (ticket.paymentStatus === WaterPaymentStatus.Confirmed || ticket.ticketStatus === WaterTicketStatus.Active) {
    throw waterBadRequest(WaterErrorCode.PaymentStatusInvalid, 'confirmed ticket purchase must use refund flow', {
      ticket_id: id,
      payment_status: ticket.paymentStatus,
      ticket_status: ticket.ticketStatus,
    });
  }
  const before = toApiRecord(ticket);
  await manager.update(WaterTicketEntity, ticket.id, {
    paymentStatus: WaterPaymentStatus.Cancelled,
    ticketStatus: WaterTicketStatus.Voided,
    remainingQuantity: 0,
    updatedBy: dto.updated_by ?? dto.created_by,
    remark: dto.reason ?? ticket.remark ?? null,
  });
  const after = await manager.findOneByOrFail(WaterTicketEntity, { id: ticket.id });
  await saveAudit(manager, {
    action: WaterAuditAction.UpdateTicket,
    actorId: dto.updated_by ?? dto.created_by,
    actorRole: dto.actor_role,
    targetType: 'water_ticket',
    targetId: ticket.id,
    before,
    after: toApiRecord(after),
    reason: dto.reason,
    key: `${dto.idempotency_key}:audit`,
  });
  return { ticket: await buildTicketView(manager, after) };
}

export async function useTicketInDb(manager: EntityManager, dto: any) {
  const existing = await findByIdempotency(manager, WaterTicketTransactionEntity, dto.idempotency_key);
  if (existing) return { transaction: toApiRecord(existing), balance: await getTicketBalance(manager, existing.ticketId!) };

  const ticket = dto.ticket_id
    ? await manager.findOneBy(WaterTicketEntity, { id: dto.ticket_id })
    : await findFirstTicketWithBalance(manager, dto.customer_id, Number(dto.quantity));
  if (!ticket) throw waterNotFound(WaterErrorCode.TicketNotFound, 'ticket not found', { customer_id: dto.customer_id });
  if (!isTicketEffective(ticket)) {
    throw waterBadRequest(WaterErrorCode.PaymentStatusInvalid, 'ticket payment is not confirmed or ticket is not active', {
      ticket_id: ticket.id,
      payment_status: ticket.paymentStatus,
      ticket_status: ticket.ticketStatus,
    });
  }
  const balance = await getTicketBalance(manager, ticket.id);
  if (balance < Number(dto.quantity)) {
    throw waterConflict(WaterErrorCode.TicketInsufficientBalance, 'ticket balance is insufficient', {
      ticket_id: ticket.id,
      balance,
      quantity: dto.quantity,
    });
  }
  const transaction = await manager.save(WaterTicketTransactionEntity, {
    ...baseRecord('api_ticket_used', dto.created_by, dto.region_id, dto.idempotency_key),
    ticketId: ticket.id,
    customerId: dto.customer_id,
    transactionType: WaterTicketTransactionType.Used,
    quantity: Number(dto.quantity),
    relatedOrderId: dto.related_order_id ?? null,
  });
  const nextBalance = balance - Number(dto.quantity);
  await manager.update(WaterTicketEntity, ticket.id, {
    remainingQuantity: nextBalance,
    ticketStatus: nextBalance <= 0 ? WaterTicketStatus.UsedUp : WaterTicketStatus.Active,
    updatedBy: dto.created_by,
  });
  await saveAudit(manager, {
    action: WaterAuditAction.UseTicket,
    actorId: dto.created_by,
    actorRole: dto.actor_role,
    targetType: 'water_ticket_transaction',
    targetId: transaction.id,
    after: toApiRecord(transaction),
    reason: dto.reason,
    key: `${dto.idempotency_key}:audit`,
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.TicketUsed,
    aggregateType: 'water_ticket_transaction',
    aggregateId: transaction.id,
    payload: toApiRecord(transaction),
    actorId: dto.created_by,
    key: `${dto.idempotency_key}:event`,
  });
  return { transaction: toApiRecord(transaction), balance: nextBalance };
}

export async function refundTicketInDb(manager: EntityManager, dto: any) {
  const existing = await findByIdempotency(manager, WaterTicketTransactionEntity, dto.idempotency_key);
  if (existing) return { transaction: toApiRecord(existing), balance: await getTicketBalance(manager, existing.ticketId!) };
  const ticket = dto.ticket_id
    ? await manager.findOneBy(WaterTicketEntity, { id: dto.ticket_id })
    : await findFirstTicketWithBalance(manager, dto.customer_id, Number(dto.quantity));
  if (!ticket) throw waterNotFound(WaterErrorCode.TicketNotFound, 'ticket not found', { customer_id: dto.customer_id });
  if (!isTicketEffective(ticket)) {
    throw waterBadRequest(WaterErrorCode.PaymentStatusInvalid, 'ticket payment is not confirmed or ticket is not active', {
      ticket_id: ticket.id,
      payment_status: ticket.paymentStatus,
      ticket_status: ticket.ticketStatus,
    });
  }
  const balance = await getTicketBalance(manager, ticket.id);
  if (balance < Number(dto.quantity)) {
    throw waterConflict(WaterErrorCode.TicketInsufficientBalance, 'refund quantity exceeds remaining entitlement', {
      ticket_id: ticket.id,
      balance,
      quantity: dto.quantity,
    });
  }
  const transaction = await manager.save(WaterTicketTransactionEntity, {
    ...baseRecord('api_ticket_refunded', dto.created_by, dto.region_id, dto.idempotency_key),
    ticketId: ticket.id,
    customerId: dto.customer_id,
    transactionType: WaterTicketTransactionType.Refunded,
    quantity: Number(dto.quantity),
    relatedOrderId: dto.related_order_id ?? null,
  });
  const nextBalance = balance - Number(dto.quantity);
  await manager.update(WaterTicketEntity, ticket.id, {
    remainingQuantity: nextBalance,
    ticketStatus: nextBalance <= 0 ? WaterTicketStatus.Refunded : WaterTicketStatus.Active,
    paymentStatus: nextBalance <= 0 ? WaterPaymentStatus.Refunded : ticket.paymentStatus,
    updatedBy: dto.created_by,
  });
  await saveAudit(manager, {
    action: WaterAuditAction.RefundTicket,
    actorId: dto.created_by,
    actorRole: dto.actor_role,
    targetType: 'water_ticket_transaction',
    targetId: transaction.id,
    after: toApiRecord(transaction),
    reason: dto.reason,
    key: `${dto.idempotency_key}:audit`,
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.TicketRefunded,
    aggregateType: 'water_ticket_transaction',
    aggregateId: transaction.id,
    payload: toApiRecord(transaction),
    actorId: dto.created_by,
    key: `${dto.idempotency_key}:event`,
  });
  return { transaction: toApiRecord(transaction), balance: nextBalance };
}

export async function createInventoryMovementInDb(manager: EntityManager, dto: any) {
  const existing = await findByIdempotency(manager, WaterInventoryMovementEntity, dto.idempotency_key);
  if (existing) return toApiRecord(existing);
  if (dto.movement_type === WaterInventoryMovementType.DeliveryOut) {
    const balance = await getInventoryBalance(manager, dto.agent_id, dto.service_point_id);
    if (balance < Number(dto.quantity)) {
      throw waterConflict(WaterErrorCode.InventoryInsufficient, 'inventory balance is insufficient', {
        balance,
        quantity: dto.quantity,
        agent_id: dto.agent_id,
        service_point_id: dto.service_point_id,
      });
    }
  }
  const movement = await manager.save(WaterInventoryMovementEntity, {
    ...baseRecord('api_inventory_movement', dto.created_by, dto.region_id, dto.idempotency_key),
    movementType: dto.movement_type,
    agentId: dto.agent_id ?? null,
    servicePointId: dto.service_point_id ?? null,
    skuCode: dto.sku_code ?? 'barrel_water_18l',
    quantity: Number(dto.quantity),
    relatedOrderId: dto.related_order_id ?? null,
    relatedPurchaseOrderId: dto.related_purchase_order_id ?? null,
    remark: dto.reason ?? dto.remark ?? null,
  });
  await saveAudit(manager, {
    action: WaterAuditAction.CreateInventoryMovement,
    actorId: dto.created_by,
    actorRole: dto.actor_role,
    targetType: 'water_inventory_movement',
    targetId: movement.id,
    after: toApiRecord(movement),
    reason: dto.reason,
    key: `${dto.idempotency_key}:audit`,
  });
  await saveEvent(manager, {
    type: WaterBusinessEventType.InventoryMoved,
    aggregateType: 'water_inventory_movement',
    aggregateId: movement.id,
    payload: toApiRecord(movement),
    actorId: dto.created_by,
    key: `${dto.idempotency_key}:event`,
  });
  return toApiRecord(movement);
}

export async function moveBarrelInDb(
  manager: EntityManager,
  id: string,
  input: {
    movementType: string;
    toHolderType?: string | null;
    toHolderId?: string | null;
    nextStatus?: WaterBarrelStatus | string | null;
    actorId?: string | null;
    actorRole?: WaterRole | null;
    reason?: string | null;
    idempotencyKey?: string | null;
  },
) {
  const existing = await findByIdempotency(manager, WaterBarrelMovementEntity, input.idempotencyKey);
  if (existing) return toApiRecord(existing);
  const barrel = await manager.findOneBy(WaterBarrelEntity, { id });
  if (!barrel) throw waterNotFound(WaterErrorCode.BarrelNotFound, 'barrel not found', { barrel_id: id });
  if ([WaterBarrelStatus.Lost, WaterBarrelStatus.Scrapped].includes(barrel.barrelStatus) && input.movementType === 'RETURNED') {
    throw waterConflict(WaterErrorCode.BarrelInvalidState, 'lost or scrapped barrel cannot be returned as normal stock', {
      barrel_id: id,
      barrel_status: barrel.barrelStatus,
    });
  }
  const movement = await manager.save(WaterBarrelMovementEntity, {
    ...baseRecord('api_barrel_movement', input.actorId, barrel.regionId, input.idempotencyKey),
    barrelId: barrel.id,
    movementType: input.movementType,
    fromHolderType: barrel.currentHolderType ?? null,
    fromHolderId: barrel.currentHolderId ?? null,
    toHolderType: input.toHolderType ?? null,
    toHolderId: input.toHolderId ?? null,
    remark: input.reason ?? null,
  });
  const nextStatus = input.nextStatus ?? barrel.barrelStatus;
  await manager.update(WaterBarrelEntity, barrel.id, {
    barrelStatus: nextStatus as WaterBarrelStatus,
    currentHolderType: input.toHolderType ?? barrel.currentHolderType,
    currentHolderId: input.toHolderId ?? barrel.currentHolderId,
    updatedBy: input.actorId ?? null,
  });
  await saveAudit(manager, {
    action: WaterAuditAction.MoveBarrel,
    actorId: input.actorId ?? undefined,
    actorRole: input.actorRole ?? undefined,
    targetType: 'water_barrel_movement',
    targetId: movement.id,
    before: toApiRecord(barrel),
    after: toApiRecord(await manager.findOneByOrFail(WaterBarrelEntity, { id: barrel.id })),
    reason: input.reason ?? undefined,
    key: `${input.idempotencyKey}:audit`,
  });
  const eventType =
    input.movementType === 'CHECKED_OUT'
      ? WaterBusinessEventType.BarrelCheckedOut
      : input.movementType === 'RETURNED'
        ? WaterBusinessEventType.BarrelReturned
        : input.movementType === 'LOST' || input.movementType === 'DAMAGED'
          ? WaterBusinessEventType.BarrelLostOrDamaged
          : WaterBusinessEventType.BarrelReturned;
  await saveEvent(manager, {
    type: eventType,
    aggregateType: 'water_barrel_movement',
    aggregateId: movement.id,
    payload: toApiRecord(movement),
    actorId: input.actorId ?? undefined,
    key: `${input.idempotencyKey}:event`,
  });
  return toApiRecord(movement);
}

async function findDeliveryBarrel(manager: EntityManager, barrelId: string | undefined, order: WaterOrderEntity) {
  if (barrelId) return manager.findOneBy(WaterBarrelEntity, { id: barrelId });
  return (
    (await manager.findOneBy(WaterBarrelEntity, {
      currentHolderType: 'SERVICE_POINT',
      currentHolderId: order.servicePointId ?? undefined,
      barrelStatus: WaterBarrelStatus.ServicePointStock,
    })) ??
    (await manager.findOneBy(WaterBarrelEntity, {
      currentHolderType: 'CUSTOMER',
      currentHolderId: order.customerId,
      barrelStatus: WaterBarrelStatus.AtCustomer,
    }))
  );
}

export async function getTicketBalance(manager: EntityManager, ticketId: string): Promise<number> {
  const transactions = await manager.findBy(WaterTicketTransactionEntity, { ticketId });
  return transactions.reduce((sum, transaction) => {
    if (transaction.transactionType === WaterTicketTransactionType.Sold) return sum + transaction.quantity;
    if (
      transaction.transactionType === WaterTicketTransactionType.Used ||
      transaction.transactionType === WaterTicketTransactionType.Refunded ||
      transaction.transactionType === WaterTicketTransactionType.Expired
    ) {
      return sum - transaction.quantity;
    }
    if (transaction.transactionType === WaterTicketTransactionType.Adjusted) return sum + transaction.quantity;
    return sum;
  }, 0);
}

async function findFirstTicketWithBalance(manager: EntityManager, customerId: string, quantity: number) {
  const tickets = await manager.findBy(WaterTicketEntity, { customerId });
  for (const ticket of tickets) {
    if (isTicketEffective(ticket) && (await getTicketBalance(manager, ticket.id)) >= quantity) return ticket;
  }
  return null;
}

function isTicketEffective(ticket: WaterTicketEntity): boolean {
  return ticket.paymentStatus === WaterPaymentStatus.Confirmed && ticket.ticketStatus === WaterTicketStatus.Active;
}

export async function getInventoryBalance(manager: EntityManager, agentId?: string | null, servicePointId?: string | null) {
  const movements = await manager.findBy(WaterInventoryMovementEntity, {
    agentId: agentId ?? undefined,
    servicePointId: servicePointId ?? undefined,
  });
  return computeInventoryBalances(movements).reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
}

function computeInventoryBalances(movements: WaterInventoryMovementEntity[]): ApiRecord[] {
  const balances = new Map<string, ApiRecord>();
  for (const movement of movements) {
    const key = `${movement.agentId ?? ''}:${movement.servicePointId ?? ''}:${movement.skuCode}`;
    const current =
      balances.get(key) ??
      ({
        id: key || movement.id,
        agent_id: movement.agentId ?? null,
        service_point_id: movement.servicePointId ?? null,
        sku_code: movement.skuCode,
        balance: 0,
      } as ApiRecord);
    current.balance = Number(current.balance ?? 0) + inventorySign(movement) * Number(movement.quantity);
    balances.set(key, current);
  }
  return Array.from(balances.values());
}

function inventorySign(movement: WaterInventoryMovementEntity): number {
  if (
    movement.movementType === WaterInventoryMovementType.AgentToServicePoint ||
    movement.movementType === WaterInventoryMovementType.HqToAgent ||
    movement.movementType === WaterInventoryMovementType.ReturnIn ||
    movement.movementType === WaterInventoryMovementType.StocktakeAdjustment
  ) {
    return 1;
  }
  return -1;
}

export async function findByIdempotency<T extends { idempotencyKey?: string | null }>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  idempotencyKey?: string | null,
): Promise<T | null> {
  if (!idempotencyKey) return null;
  return manager.findOne(entity, { where: { idempotencyKey } as any });
}

export async function saveEvent(
  manager: EntityManager,
  input: {
    type: WaterBusinessEventType;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    actorId?: string | null;
    key: string;
  },
) {
  const idempotencyKey = input.key;
  const existing = await findByIdempotency(manager, WaterBusinessEventEntity, idempotencyKey);
  if (existing) return existing;
  return manager.save(WaterBusinessEventEntity, {
    ...baseRecord('api_event', input.actorId, null, idempotencyKey),
    eventId: randomUUID(),
    eventType: input.type,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payloadJson: input.payload,
    eventVersion: 1,
    occurredAt: new Date(),
    syncAttempts: 0,
    lastSyncError: null,
  });
}

export async function saveAudit(
  manager: EntityManager,
  input: {
    action: WaterAuditAction | string;
    actorId?: string | null;
    actorRole?: WaterRole | null;
    targetType: string;
    targetId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
    key: string;
  },
) {
  const existing = await findByIdempotency(manager, WaterAuditLogEntity, input.key);
  if (existing) return existing;
  return manager.save(WaterAuditLogEntity, {
    ...baseRecord('api_audit', input.actorId, null, input.key),
    actorId: input.actorId ?? 'admin',
    actorRole: input.actorRole ?? WaterRole.Admin,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null,
    reason: input.reason ?? null,
    metadataJson: { source: 'water_api_db_path' },
  });
}

export function baseRecord(name: string, actorId?: string | null, regionId?: string | null, idempotencyKey?: string | null) {
  const key = idempotencyKey ?? randomUUID();
  return {
    externalId: `api_${name}_${hashKey(key)}`.slice(0, 64),
    sourceSystem: 'water',
    syncStatus: WaterSyncStatus.Pending,
    idempotencyKey: key,
    companyId: 'stark_water',
    regionId: regionId ?? null,
    createdBy: actorId ?? 'admin',
    updatedBy: actorId ?? 'admin',
  };
}

export function apiKey(...parts: unknown[]): string {
  return `api:${parts.map((part) => String(part ?? '')).join(':')}`.slice(0, 150);
}

function hashKey(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 24);
}

export function toApiRecord(entity: any): ApiRecord {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entity)) {
    record[toSnakeCase(key)] = value instanceof Date ? value.toISOString() : value;
  }
  return record as ApiRecord;
}

function toCustomerApiRecord(customer: WaterCustomerEntity, masked: boolean): ApiRecord {
  const record = toApiRecord(customer);
  const phone = String(record.phone ?? '');
  const display = masked ? maskPhoneNumber(phone, { role: WaterRole.Admin, hasExplicitGrant: false }) : phone;
  return {
    ...record,
    phone: display,
    normalized_phone: masked ? null : record.normalized_phone,
    phone_display: display,
  } as ApiRecord;
}

async function buildCustomerSummary(
  manager: EntityManager,
  customer: WaterCustomerEntity,
  masked: boolean,
): Promise<ApiRecord> {
  const record = toCustomerApiRecord(customer, masked);
  const addresses = await manager.find(WaterCustomerAddressEntity, { where: { customerId: customer.id } });
  const addressViews = await buildAddressViews(manager, addresses, true);
  const defaultAddress =
    addressViews.find((address) => address.id === customer.defaultAddressId) ??
    addressViews.find((address) => address.is_default === true) ??
    addressViews[0] ??
    null;
  const orders = await manager.find(WaterOrderEntity, {
    where: { customerId: customer.id },
    order: { createdAt: 'DESC' },
  });
  const deliveredOrders = orders.filter(
    (order) => order.orderStatus === WaterOrderStatus.Delivered || order.deliveryStatus === WaterDeliveryStatus.Delivered,
  );
  const recentOrder = orders[0] ?? null;
  const tickets = await manager.find(WaterTicketEntity, { where: { customerId: customer.id } });
  let ticketBalance = 0;
  for (const ticket of tickets) {
    if (isTicketEffective(ticket)) {
      ticketBalance += await getTicketBalance(manager, ticket.id);
    }
  }
  const barrelCount = await manager.count(WaterBarrelEntity, {
    where: { currentHolderType: 'CUSTOMER', currentHolderId: customer.id },
  });

  const regionId = String(defaultAddress?.region_id ?? customer.regionId ?? '');
  const servicePointId = String(defaultAddress?.service_point_id ?? customer.servicePointId ?? '');
  const agentId = String(customer.agentId ?? '');

  return {
    ...record,
    customer_type: customer.customerType,
    address_count: addressViews.length,
    default_address_id: defaultAddress?.id ?? customer.defaultAddressId ?? null,
    default_address_label: defaultAddress?.address_label ?? null,
    default_address: defaultAddress?.full_address ?? defaultAddress?.address_line ?? null,
    total_delivery_count: deliveredOrders.length,
    ticket_balance: ticketBalance,
    barrel_count: barrelCount,
    recent_order_at: recentOrder?.createdAt?.toISOString?.() ?? null,
    latest_delivery_at: latestDateString(deliveredOrders.map((order) => order.updatedAt)),
    region_id: regionId || null,
    region_name: regionId ? await lookupRegionName(manager, regionId) : '未分配',
    agent_id: agentId || null,
    agent_name: agentId ? await lookupAgentName(manager, agentId) : '未分配',
    service_point_id: servicePointId || null,
    service_point_name: servicePointId ? await lookupServicePointName(manager, servicePointId) : '未分配',
    status: customer.deletedAt ? 'INACTIVE' : 'ACTIVE',
  };
}

async function buildTicketView(manager: EntityManager, ticket: WaterTicketEntity): Promise<ApiRecord> {
  const record = toApiRecord(ticket);
  const customer = await manager.findOneBy(WaterCustomerEntity, { id: ticket.customerId });
  const customerSummary = customer ? await buildCustomerSummary(manager, customer, true) : null;
  const balance = isTicketEffective(ticket) ? await getTicketBalance(manager, ticket.id) : 0;
  const totalQuantity = Number(ticket.totalQuantity ?? 0);
  const amount = Number(ticket.amount ?? 0);
  return {
    ...record,
    customer_name: customerSummary?.customer_name ?? customer?.customerName ?? '未找到客户',
    customer_phone_display: customerSummary?.phone_display ?? '-',
    default_address: customerSummary?.default_address ?? '未设置默认地址',
    ticket_package: `${totalQuantity}桶票`,
    amount,
    balance,
    remaining_quantity: balance,
    payment_method: ticket.paymentMethod ?? null,
    payment_status: ticket.paymentStatus ?? WaterPaymentStatus.Confirmed,
    ticket_status: ticket.ticketStatus ?? WaterTicketStatus.Active,
    confirmed_at: ticket.confirmedAt?.toISOString?.() ?? null,
    purchase_summary:
      ticket.paymentStatus === WaterPaymentStatus.Confirmed
        ? `${totalQuantity}桶票｜已确认｜可用 ${balance} 桶`
        : `${totalQuantity}桶票｜待确认｜暂不可核销`,
  };
}

async function buildAddressViews(
  manager: EntityManager,
  addresses: WaterCustomerAddressEntity[],
  masked: boolean,
): Promise<ApiRecord[]> {
  const views: ApiRecord[] = [];
  for (const address of addresses) {
    views.push(await buildAddressView(manager, address, masked));
  }
  return views;
}

async function buildAddressView(
  manager: EntityManager,
  address: WaterCustomerAddressEntity,
  masked: boolean,
): Promise<ApiRecord> {
  const record = toApiRecord(address);
  const phone = address.contactPhone ?? '';
  const display = masked ? maskPhoneNumber(phone, { role: WaterRole.Admin, hasExplicitGrant: false }) : phone;
  const deliveredOrders = (
    await manager.find(WaterOrderEntity, {
      where: { addressId: address.id },
      order: { updatedAt: 'DESC' },
    })
  ).filter((order) => order.orderStatus === WaterOrderStatus.Delivered || order.deliveryStatus === WaterDeliveryStatus.Delivered);
  const fullAddress = [address.province, address.city, address.district, address.addressLine].filter(Boolean).join('');
  const regionId = address.regionId ?? null;
  const servicePointId = address.servicePointId ?? null;
  return {
    ...record,
    address_label: address.addressLabel ?? '未标记',
    contact_phone: display,
    normalized_contact_phone: masked ? null : address.normalizedContactPhone,
    phone_display: display,
    full_address: fullAddress || address.addressLine,
    service_point_id: servicePointId,
    service_point_name: servicePointId ? await lookupServicePointName(manager, servicePointId) : '未分配',
    region_id: regionId,
    region_name: regionId ? await lookupRegionName(manager, regionId) : '未分配',
    status: address.addressStatus ?? 'ACTIVE',
    address_status: address.addressStatus ?? 'ACTIVE',
    delivery_count: deliveredOrders.length,
    latest_delivery_at: latestDateString(deliveredOrders.map((order) => order.updatedAt)),
  } as ApiRecord;
}

async function buildOrderSummary(manager: EntityManager, order: WaterOrderEntity): Promise<ApiRecord> {
  const customer = await manager.findOneBy(WaterCustomerEntity, { id: order.customerId });
  const address = order.addressId ? await manager.findOneBy(WaterCustomerAddressEntity, { id: order.addressId }) : null;
  const servicePointId = order.servicePointId ?? address?.servicePointId ?? customer?.servicePointId ?? null;
  const agentId = order.agentId ?? customer?.agentId ?? null;
  const deliveryQuantity = Math.max(Number(order.barrelQuantityToReturn ?? 0), Number(order.ticketQuantityToUse ?? 0), 1);
  const ticketQuantity = Math.max(Number(order.ticketQuantityToUse ?? 0), 0);
  const cashQuantity = Math.max(deliveryQuantity - ticketQuantity, 0);
  const cashAmount = Number(order.totalAmount ?? 0);
  const settlementSummary =
    ticketQuantity <= 0
      ? `配送 ${deliveryQuantity} 桶｜散单现金 ${cashAmount.toFixed(2)} 元`
      : cashQuantity <= 0
        ? `配送 ${deliveryQuantity} 桶｜全部水票核销 ${ticketQuantity} 桶`
        : `配送 ${deliveryQuantity} 桶｜水票 ${ticketQuantity} 桶｜现金 ${cashQuantity} 桶｜现金金额 ${cashAmount.toFixed(2)} 元`;
  return {
    ...toApiRecord(order),
    customer_name: customer?.customerName ?? '未知客户',
    customer_phone_display: customer
      ? maskPhoneNumber(customer.phone, { role: WaterRole.Admin, hasExplicitGrant: false })
      : null,
    address_label: address?.addressLabel ?? null,
    address_contact_name: address?.contactName ?? null,
    address_phone_display: address
      ? maskPhoneNumber(address.contactPhone, { role: WaterRole.Admin, hasExplicitGrant: false })
      : null,
    address_summary: address
      ? [address.addressLabel, address.contactName, address.addressLine].filter(Boolean).join('｜')
      : '未选择地址',
    delivery_quantity: deliveryQuantity,
    cash_quantity: cashQuantity,
    cash_amount: cashAmount,
    settlement_method: ticketQuantity <= 0 ? 'CASH' : cashQuantity <= 0 ? 'TICKET' : 'MIXED',
    settlement_summary: settlementSummary,
    agent_name: agentId ? await lookupAgentName(manager, agentId) : '未分配',
    service_point_name: servicePointId ? await lookupServicePointName(manager, servicePointId) : '未分配',
  } as ApiRecord;
}

async function buildInventoryBalanceView(manager: EntityManager, balance: ApiRecord): Promise<ApiRecord> {
  const agentId = String(balance.agent_id ?? '');
  const servicePointId = String(balance.service_point_id ?? '');
  return {
    ...balance,
    agent_name: agentId ? await lookupAgentName(manager, agentId) : '未分配',
    service_point_name: servicePointId ? await lookupServicePointName(manager, servicePointId) : '未分配',
    sku_name: skuLabel(String(balance.sku_code ?? '')),
  };
}

async function buildInventoryMovementView(
  manager: EntityManager,
  movement: WaterInventoryMovementEntity,
): Promise<ApiRecord> {
  const record = toApiRecord(movement);
  const relatedOrder = movement.relatedOrderId
    ? await manager.findOneBy(WaterOrderEntity, { id: movement.relatedOrderId })
    : null;
  const orderSummary = relatedOrder ? await buildOrderSummary(manager, relatedOrder) : null;
  const source = await inventorySourceParty(manager, movement, orderSummary);
  const target = await inventoryTargetParty(manager, movement, orderSummary);
  const agentName = movement.agentId ? await lookupAgentName(manager, movement.agentId) : '未分配';
  const servicePointName = movement.servicePointId
    ? await lookupServicePointName(manager, movement.servicePointId)
    : '未分配';

  return {
    ...record,
    movement_type_label: inventoryMovementLabel(movement.movementType),
    quantity_text: `${movement.quantity} 桶`,
    sku_name: skuLabel(movement.skuCode),
    agent_name: agentName,
    service_point_name: servicePointName,
    from_party_type_label: source.typeLabel,
    from_party_name: source.name,
    to_party_type_label: target.typeLabel,
    to_party_name: target.name,
    related_order_code: relatedOrder ? formatOrderCode(relatedOrder.id) : null,
    related_order_summary: orderSummary ? orderBusinessText(orderSummary) : '未关联订单',
    operator_name: displayActorName(movement.createdBy || movement.updatedBy),
    reason: movement.remark || '无备注',
    business_summary: inventoryMovementBusinessText(movement, source.name, target.name, orderSummary),
  } as ApiRecord;
}

async function buildBusinessEventView(manager: EntityManager, event: WaterBusinessEventEntity): Promise<ApiRecord> {
  const record = toApiRecord(event);
  const aggregateSummary = await buildAggregateSummary(manager, event);
  const sync = eventSyncView(event.syncStatus);
  return {
    ...record,
    event_type_label: businessEventLabel(event.eventType),
    local_status_label: '本地已生成',
    sync_status_label: sync.label,
    sync_status_note: sync.note,
    aggregate_summary: aggregateSummary.summary,
    related_object_summary: aggregateSummary.summary,
    business_summary: {
      event: businessEventLabel(event.eventType),
      local_status: '本地业务事件已生成',
      hq_sync_status: sync.label,
      hq_sync_note: sync.note,
      related_object: aggregateSummary.summary,
      action_result: aggregateSummary.actionResult,
      occurred_at: event.occurredAt?.toISOString?.() ?? record.occurred_at,
    },
    sync_attempts: event.syncAttempts ?? 0,
    last_sync_error: event.lastSyncError ?? event.syncError ?? null,
  } as ApiRecord;
}

async function buildAggregateSummary(
  manager: EntityManager,
  event: WaterBusinessEventEntity,
): Promise<{ summary: string; actionResult: string }> {
  if (event.aggregateType === 'water_customer') {
    const customer = await manager.findOneBy(WaterCustomerEntity, { id: event.aggregateId });
    return {
      summary: customer ? `客户：${customer.customerName}` : '客户：未知客户',
      actionResult: businessEventLabel(event.eventType),
    };
  }

  if (event.aggregateType === 'water_order') {
    const order = await manager.findOneBy(WaterOrderEntity, { id: event.aggregateId });
    if (!order) return { summary: '订单：未知订单', actionResult: businessEventLabel(event.eventType) };
    const summary = await buildOrderSummary(manager, order);
    return {
      summary: `${formatOrderCode(order.id)}｜${summary.customer_name ?? '未知客户'}｜${summary.service_point_name ?? '未分配'}`,
      actionResult:
        event.eventType === WaterBusinessEventType.OrderDelivered
          ? `订单已完成配送，配送数量 ${summary.delivery_quantity ?? 1} 桶`
          : businessEventLabel(event.eventType),
    };
  }

  if (event.aggregateType === 'water_ticket_transaction') {
    const transaction = await manager.findOneBy(WaterTicketTransactionEntity, { id: event.aggregateId });
    const customer = transaction?.customerId
      ? await manager.findOneBy(WaterCustomerEntity, { id: transaction.customerId })
      : null;
    return {
      summary: `水票流水｜${customer?.customerName ?? '未知客户'}｜${transaction?.quantity ?? '-'} 桶`,
      actionResult: businessEventLabel(event.eventType),
    };
  }

  if (event.aggregateType === 'water_inventory_movement') {
    const movement = await manager.findOneBy(WaterInventoryMovementEntity, { id: event.aggregateId });
    if (!movement) return { summary: '库存流水：未知流水', actionResult: businessEventLabel(event.eventType) };
    const movementView = await buildInventoryMovementView(manager, movement);
    return {
      summary: String(movementView.business_summary ?? '库存流水已生成'),
      actionResult: `${movementView.movement_type_label ?? '库存流水'} ${movementView.quantity_text ?? ''}`,
    };
  }

  if (event.aggregateType === 'water_barrel_movement') {
    const movement = await manager.findOneBy(WaterBarrelMovementEntity, { id: event.aggregateId });
    const barrel = movement?.barrelId ? await manager.findOneBy(WaterBarrelEntity, { id: movement.barrelId }) : null;
    return {
      summary: `桶流转｜${barrel?.barrelCode ?? '未知桶'}｜${movement?.movementType ?? '未知动作'}`,
      actionResult: businessEventLabel(event.eventType),
    };
  }

  return {
    summary: `${aggregateTypeLabel(event.aggregateType)}｜${shortId(event.aggregateId)}`,
    actionResult: businessEventLabel(event.eventType),
  };
}

async function inventorySourceParty(
  manager: EntityManager,
  movement: WaterInventoryMovementEntity,
  orderSummary: ApiRecord | null,
): Promise<{ typeLabel: string; name: string }> {
  if (movement.movementType === WaterInventoryMovementType.HqToAgent) {
    return { typeLabel: '总部库存', name: '总部库存' };
  }
  if (movement.movementType === WaterInventoryMovementType.AgentToServicePoint) {
    return {
      typeLabel: '一级代理',
      name: movement.agentId ? await lookupAgentName(manager, movement.agentId) : '未分配代理',
    };
  }
  if (movement.movementType === WaterInventoryMovementType.DeliveryOut) {
    return {
      typeLabel: '服务点库存',
      name: movement.servicePointId
        ? await lookupServicePointName(manager, movement.servicePointId)
        : String(orderSummary?.service_point_name ?? '未分配服务点'),
    };
  }
  if (movement.movementType === WaterInventoryMovementType.ReturnIn) {
    return { typeLabel: '客户回收', name: String(orderSummary?.customer_name ?? '客户或回收来源') };
  }
  return { typeLabel: '系统调整', name: displayActorName(movement.createdBy) };
}

async function inventoryTargetParty(
  manager: EntityManager,
  movement: WaterInventoryMovementEntity,
  orderSummary: ApiRecord | null,
): Promise<{ typeLabel: string; name: string }> {
  if (movement.movementType === WaterInventoryMovementType.HqToAgent) {
    return {
      typeLabel: '一级代理',
      name: movement.agentId ? await lookupAgentName(manager, movement.agentId) : '未分配代理',
    };
  }
  if (movement.movementType === WaterInventoryMovementType.AgentToServicePoint) {
    return {
      typeLabel: '二级服务点',
      name: movement.servicePointId ? await lookupServicePointName(manager, movement.servicePointId) : '未分配服务点',
    };
  }
  if (movement.movementType === WaterInventoryMovementType.DeliveryOut) {
    return { typeLabel: '客户订单', name: String(orderSummary?.customer_name ?? '配送客户') };
  }
  if (movement.movementType === WaterInventoryMovementType.ReturnIn) {
    return {
      typeLabel: '服务点库存',
      name: movement.servicePointId ? await lookupServicePointName(manager, movement.servicePointId) : '未分配服务点',
    };
  }
  if (movement.movementType === WaterInventoryMovementType.Damage) return { typeLabel: '损坏登记', name: '损坏库存' };
  if (movement.movementType === WaterInventoryMovementType.Loss) return { typeLabel: '遗失登记', name: '遗失库存' };
  return { typeLabel: '盘点调整', name: '盘点后的库存余额' };
}

function inventoryMovementBusinessText(
  movement: WaterInventoryMovementEntity,
  source: string,
  target: string,
  orderSummary: ApiRecord | null,
): string {
  const orderText = orderSummary ? `，关联 ${formatOrderCode(String(orderSummary.id))}` : '';
  return `${inventoryMovementLabel(movement.movementType)}：${source} -> ${target}，数量 ${movement.quantity} 桶${orderText}`;
}

function orderBusinessText(orderSummary: ApiRecord): string {
  return `${formatOrderCode(String(orderSummary.id))}｜${orderSummary.customer_name ?? '未知客户'}｜${orderSummary.service_point_name ?? '未分配服务点'}`;
}

function formatOrderCode(orderId: string): string {
  return `ORD-${shortId(orderId)}`;
}

function shortId(value?: string | null): string {
  return String(value ?? '').replace(/-/g, '').slice(0, 8).toUpperCase() || 'UNKNOWN';
}

function displayActorName(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) return '后台操作员';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) return '后台操作员';
  return text;
}

function inventoryMovementLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    HQ_TO_AGENT: '总部调拨给一级代理',
    AGENT_TO_SERVICE_POINT: '一级代理调拨给服务点',
    DELIVERY_OUT: '配送出库',
    RETURN_IN: '回收入库',
    DAMAGE: '损坏出库',
    LOSS: '遗失出库',
    STOCKTAKE_ADJUSTMENT: '盘点调整',
  };
  return labels[String(value ?? '')] ?? String(value ?? '未知流水');
}

function skuLabel(value?: string | null): string {
  if (!value || value === 'barrel_water_18l') return '18L 桶装水';
  return value;
}

function businessEventLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    [WaterBusinessEventType.CustomerCreated]: '客户已创建',
    [WaterBusinessEventType.CustomerUpdated]: '客户已更新',
    [WaterBusinessEventType.AgentCreated]: '代理已创建',
    [WaterBusinessEventType.ServicePointCreated]: '服务点已创建',
    [WaterBusinessEventType.ServicePointTransferred]: '服务点已转移',
    [WaterBusinessEventType.OrderCreated]: '订单已创建',
    [WaterBusinessEventType.OrderDelivered]: '订单已配送完成',
    [WaterBusinessEventType.OrderCancelled]: '订单已取消',
    [WaterBusinessEventType.TicketSold]: '水票已销售',
    [WaterBusinessEventType.TicketUsed]: '水票已核销',
    [WaterBusinessEventType.TicketRefunded]: '水票已退款',
    [WaterBusinessEventType.InventoryMoved]: '库存流水已生成',
    [WaterBusinessEventType.BarrelCheckedOut]: '水桶已出库',
    [WaterBusinessEventType.BarrelReturned]: '空桶已回收',
    [WaterBusinessEventType.BarrelLostOrDamaged]: '水桶已登记丢失或损坏',
    [WaterBusinessEventType.AgentPurchaseOrderCreated]: '代理订货单已创建',
    [WaterBusinessEventType.AgentPurchaseOrderPaid]: '代理订货单已付款',
    [WaterBusinessEventType.DepositReceived]: '押金或保证金已收取',
    [WaterBusinessEventType.PenaltyCreated]: '违约金已创建',
    [WaterBusinessEventType.SyncReconciled]: '同步已对账',
  };
  return labels[String(value ?? '')] ?? String(value ?? '未知事件');
}

function eventSyncView(value?: WaterSyncStatus | string | null): { label: string; note: string } {
  if (value === WaterSyncStatus.Synced) {
    return { label: '已同步到总公司', note: '仅在未来总公司接入后使用。' };
  }
  if (value === WaterSyncStatus.Failed) {
    return { label: '同步失败', note: '需要查看错误原因；当前不代表本地业务失败。' };
  }
  if (value === WaterSyncStatus.Ignored) {
    return { label: '已忽略', note: '该事件被人工或规则标记为无需同步。' };
  }
  if (value === WaterSyncStatus.Conflict) {
    return { label: '同步冲突', note: '未来总公司接入时需要人工处理。' };
  }
  return { label: '待同步', note: '总公司系统尚未接入前，待同步是正常状态，不代表试单失败。' };
}

function aggregateTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    water_customer: '客户',
    water_order: '订单',
    water_ticket_transaction: '水票流水',
    water_inventory_movement: '库存流水',
    water_barrel_movement: '桶流转',
  };
  return labels[String(value ?? '')] ?? String(value ?? '未知对象');
}

async function lookupRegionName(manager: EntityManager, id: string): Promise<string> {
  const region = await manager.findOneBy(WaterRegionEntity, { id });
  return region?.regionName ?? '未分配';
}

async function lookupAgentName(manager: EntityManager, id: string): Promise<string> {
  const agent = await manager.findOneBy(WaterAgentEntity, { id });
  return agent?.agentName ?? '未分配';
}

async function lookupServicePointName(manager: EntityManager, id: string): Promise<string> {
  const servicePoint = await manager.findOneBy(WaterServicePointEntity, { id });
  return servicePoint?.servicePointName ?? '未分配';
}

function latestDateString(values: Array<Date | null | undefined>): string | null {
  const timestamps = values
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime())
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function toSnakeCase(input: string): string {
  return input.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}
