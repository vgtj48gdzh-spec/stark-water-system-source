import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_growth_assessments' })
@Index(['agentId', 'period'])
export class WaterGrowthAssessmentEntity extends WaterBaseEntity {
  @Column({ name: 'agent_id', type: 'varchar', length: 64 })
  agentId!: string;

  @Column({ name: 'period', type: 'varchar', length: 16 })
  period!: string;

  @Column({ name: 'base_volume', type: 'int', default: 0 })
  baseVolume!: number;

  @Column({ name: 'actual_volume', type: 'int', default: 0 })
  actualVolume!: number;

  @Column({ name: 'growth_volume', type: 'int', default: 0 })
  growthVolume!: number;

  @Column({ name: 'penalty_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  penaltyAmount!: string;
}
