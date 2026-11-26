import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_customers' })
@Index(['phone'])
export class WaterCustomerEntity extends WaterBaseEntity {
  @Column({ name: 'customer_name', type: 'varchar', length: 120 })
  customerName!: string;

  @Column({ name: 'phone', type: 'varchar', length: 32 })
  phone!: string;

  @Column({ name: 'normalized_phone', type: 'varchar', length: 32 })
  normalizedPhone!: string;

  @Column({ name: 'customer_type', type: 'varchar', length: 40, default: 'HOUSEHOLD' })
  customerType!: string;

  @Column({ name: 'default_address_id', type: 'varchar', length: 64, nullable: true })
  defaultAddressId?: string | null;

  @Column({ name: 'agent_id', type: 'varchar', length: 64, nullable: true })
  agentId?: string | null;

  @Column({ name: 'service_point_id', type: 'varchar', length: 64, nullable: true })
  servicePointId?: string | null;
}
