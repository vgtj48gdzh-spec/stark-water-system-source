import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { canViewFullPhone, maskPhoneNumber, normalizePhoneNumber } from '../common/phone-mask.util';
import { WaterErrorCode, waterConflict } from '../common/water-api-error';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { WaterAuditAction, WaterBusinessEventType, WaterRole } from '../common/water.enums';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  private readonly collection = 'customers';

  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list(viewerRole = WaterRole.Admin, hasFullPhoneGrant = true) {
    return this.listCustomers(viewerRole, hasFullPhoneGrant);
  }

  listCustomers(viewerRole = WaterRole.Admin, hasFullPhoneGrant = true) {
    return this.store
      .list(this.collection)
      .map((customer) => this.toCustomerView(customer, viewerRole, hasFullPhoneGrant));
  }

  get(id: string, viewerRole = WaterRole.Admin, hasFullPhoneGrant = true) {
    return this.getCustomer(id, viewerRole, hasFullPhoneGrant);
  }

  getCustomer(id: string, viewerRole = WaterRole.Admin, hasFullPhoneGrant = true) {
    return this.toCustomerView(this.store.get(this.collection, id), viewerRole, hasFullPhoneGrant);
  }

  create(dto: CreateCustomerDto) {
    return this.createCustomer(dto);
  }

  createCustomer(dto: CreateCustomerDto) {
    const normalizedPhone = normalizePhoneNumber(dto.phone);
    const existingByIdempotency = dto.idempotency_key
      ? this.store.findByField(this.collection, 'idempotency_key', dto.idempotency_key)
      : undefined;
    if (existingByIdempotency) {
      return this.toCustomerView(existingByIdempotency, dto.actor_role ?? WaterRole.Admin, true);
    }
    const duplicate = this.store
      .list(this.collection)
      .find((customer) => String(customer.normalized_phone ?? customer.phone ?? '') === normalizedPhone);
    if (duplicate) {
      throw waterConflict(WaterErrorCode.CustomerPhoneExists, 'customer phone already exists', {
        existing_customer: {
          id: duplicate.id,
          customer_id: duplicate.id,
          customer_name: duplicate.customer_name ?? duplicate.name ?? '已有客户',
          phone_display: maskPhoneNumber(String(duplicate.phone ?? ''), {
            role: WaterRole.Admin,
            hasExplicitGrant: false,
          }),
          address_count: 0,
          recent_order_at: duplicate.created_at ?? null,
        },
      });
    }
    const { record: customer, created } = this.store.createIdempotent(this.collection, dto.idempotency_key, {
      ...dto,
      normalized_phone: normalizedPhone,
    });

    if (!created) {
      return this.toCustomerView(customer, dto.actor_role ?? WaterRole.Admin, true);
    }

    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.CreateCustomer,
      targetType: 'water_customer',
      targetId: customer.id,
      after: customer,
      metadata: { normalized_phone: normalizedPhone, phone_masked_for_non_privileged_roles: true },
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.CustomerCreated,
      aggregateType: 'water_customer',
      aggregateId: customer.id,
      payload: customer,
      idempotencyKey: dto.idempotency_key
        ? `event:${WaterBusinessEventType.CustomerCreated}:${dto.idempotency_key}`
        : undefined,
      createdBy: dto.created_by,
    });
    return this.toCustomerView(customer, dto.actor_role ?? WaterRole.Admin, true);
  }

  update(id: string, dto: UpdateCustomerDto) {
    const before = this.store.get(this.collection, id);
    const customer = this.store.update(this.collection, id, {
      ...dto,
      normalized_phone: dto.phone ? normalizePhoneNumber(dto.phone) : before.normalized_phone,
    });
    this.auditLogs.record({
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.UpdateCustomer,
      targetType: 'water_customer',
      targetId: customer.id,
      before,
      after: customer,
      reason: dto.reason,
      metadata: { updated_fields: Object.keys(dto) },
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.CustomerUpdated,
      aggregateType: 'water_customer',
      aggregateId: customer.id,
      payload: customer,
      createdBy: dto.updated_by,
    });
    return this.toCustomerView(customer, dto.actor_role ?? WaterRole.Admin, true);
  }

  createAddress(customerId: string, dto: CreateAddressDto) {
    const customer = this.store.get(this.collection, customerId);
    const contactPhone = normalizePhoneNumber(dto.contact_phone ?? String(customer.phone ?? ''));
    const { record: address, created } = this.store.createIdempotent('addresses', dto.idempotency_key, {
      ...dto,
      customer_id: customerId,
      contact_phone: contactPhone,
      normalized_contact_phone: contactPhone,
      address_label: dto.address_label ?? '家庭',
      address_status: dto.address_status ?? 'ACTIVE',
    });

    if (!created) {
      return address;
    }

    this.auditLogs.record({
      actorId: dto.created_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.CreateAddress,
      targetType: 'water_customer_address',
      targetId: address.id,
      after: address,
      reason: dto.reason,
      metadata: { customer_id: customerId },
    });
    return address;
  }

  private toCustomerView(
    customer: Record<string, unknown> & { id: string },
    viewerRole: WaterRole,
    hasFullPhoneGrant: boolean,
  ) {
    const phone = String(customer.phone ?? '');
    const context = { role: viewerRole, hasExplicitGrant: hasFullPhoneGrant };
    const phoneDisplay = maskPhoneNumber(phone, context);
    const canViewFull = canViewFullPhone(context);

    if (canViewFull) {
      this.auditLogs.record({
        actorRole: viewerRole,
        action: WaterAuditAction.ViewFullPhone,
        targetType: 'water_customer',
        targetId: customer.id,
        reason: 'customer_view',
        metadata: { normalized_phone: customer.normalized_phone },
      });
    }

    return {
      ...customer,
      phone: canViewFull ? phone : phoneDisplay,
      normalized_phone: customer.normalized_phone,
      phone_display: phoneDisplay,
    };
  }
}
