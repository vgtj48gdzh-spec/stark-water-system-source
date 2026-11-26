import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_penalties' })
@Index(['agentId'])
export class WaterPenaltyEntity extends WaterBaseEntity {
  @Column({ name: 'agent_id', type: 'varchar', length: 64 })
  agentId!: string;

  @Column({ name: 'penalty_type', type: 'varchar', length: 60 })
  penaltyType!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'penalty_status', type: 'varchar', length: 40, default: 'PENDING' })
  penaltyStatus!: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;
}
