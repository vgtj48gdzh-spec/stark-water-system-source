import { Column, Entity } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterServicePointStatus } from '../common/water.enums';

@Entity({ name: 'water_service_points' })
export class WaterServicePointEntity extends WaterBaseEntity {
  @Column({ name: 'service_point_name', type: 'varchar', length: 120 })
  servicePointName!: string;

  @Column({
    name: 'service_point_status',
    type: 'varchar',
    length: 40,
    default: WaterServicePointStatus.Lead,
  })
  servicePointStatus!: WaterServicePointStatus;

  @Column({ name: 'agent_id', type: 'varchar', length: 64, nullable: true })
  agentId?: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 120, nullable: true })
  contactName?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone?: string | null;

  @Column({ name: 'incubated_by_hq', type: 'boolean', default: true })
  incubatedByHq!: boolean;

  @Column({ name: 'transfer_at', type: 'timestamp', nullable: true })
  transferAt?: Date | null;
}
