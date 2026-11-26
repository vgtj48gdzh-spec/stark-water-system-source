import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizePhoneNumber } from '../common/phone-mask.util';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { WaterAuditAction } from '../common/water.enums';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  private readonly collection = 'addresses';

  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list() {
    return this.store.list(this.collection);
  }

  create(dto: CreateAddressDto) {
    const contactPhone = dto.contact_phone ? normalizePhoneNumber(dto.contact_phone) : '';
    const { record: address, created } = this.store.createIdempotent(this.collection, dto.idempotency_key, {
      ...dto,
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
      metadata: { customer_id: dto.customer_id },
    });
    return address;
  }

  update(id: string, dto: UpdateAddressDto) {
    const before = this.store.get(this.collection, id);
    const address = this.store.update(this.collection, id, {
      ...dto,
      contact_phone: dto.contact_phone ? normalizePhoneNumber(dto.contact_phone) : before.contact_phone,
    });
    this.auditLogs.record({
      actorId: dto.updated_by,
      actorRole: dto.actor_role,
      action: WaterAuditAction.UpdateAddress,
      targetType: 'water_customer_address',
      targetId: address.id,
      before,
      after: address,
      reason: dto.reason,
      metadata: { customer_id: address.customer_id },
    });
    return address;
  }
}
