import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_customer_addresses' })
@Index(['customerId'])
export class WaterCustomerAddressEntity extends WaterBaseEntity {
  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 120 })
  contactName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32 })
  contactPhone!: string;

  @Column({ name: 'normalized_contact_phone', type: 'varchar', length: 32, nullable: true })
  normalizedContactPhone?: string | null;

  @Column({ name: 'address_label', type: 'varchar', length: 40, nullable: true })
  addressLabel?: string | null;

  @Column({ name: 'province', type: 'varchar', length: 80, nullable: true })
  province?: string | null;

  @Column({ name: 'city', type: 'varchar', length: 80, nullable: true })
  city?: string | null;

  @Column({ name: 'district', type: 'varchar', length: 80, nullable: true })
  district?: string | null;

  @Column({ name: 'address_line', type: 'varchar', length: 255 })
  addressLine!: string;

  @Column({ name: 'service_point_id', type: 'varchar', length: 64, nullable: true })
  servicePointId?: string | null;

  @Column({ name: 'address_status', type: 'varchar', length: 40, default: 'ACTIVE' })
  addressStatus!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
}
