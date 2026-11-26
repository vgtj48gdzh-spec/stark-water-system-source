import { Column, Entity } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterAgentStatus } from '../common/water.enums';

@Entity({ name: 'water_agents' })
export class WaterAgentEntity extends WaterBaseEntity {
  @Column({ name: 'agent_name', type: 'varchar', length: 120 })
  agentName!: string;

  @Column({ name: 'agent_status', type: 'varchar', length: 40, default: WaterAgentStatus.Candidate })
  agentStatus!: WaterAgentStatus;

  @Column({ name: 'contact_name', type: 'varchar', length: 120, nullable: true })
  contactName?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone?: string | null;

  @Column({ name: 'deposit_required_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  depositRequiredAmount!: string;

  @Column({ name: 'deposit_paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  depositPaidAmount!: string;

  @Column({ name: 'base_sales_volume', type: 'int', default: 0 })
  baseSalesVolume!: number;
}
