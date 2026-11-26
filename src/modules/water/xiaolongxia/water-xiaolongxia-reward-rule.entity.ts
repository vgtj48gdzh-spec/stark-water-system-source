import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { XiaolongxiaRewardRuleStatus, XiaolongxiaRewardTrigger, XiaolongxiaRewardType } from './xiaolongxia.enums';

/**
 * V1 design-stage skeleton. This entity is intentionally NOT registered in
 * src/modules/water/water.entities.ts or src/database/data-source.ts.
 * Registration requires owner approval and a reviewed migration first.
 */
@Entity({ name: 'water_xiaolongxia_reward_rules' })
@Index(['status'])
export class WaterXiaolongxiaRewardRuleEntity extends WaterBaseEntity {
  @Column({ name: 'rule_code', type: 'varchar', length: 80, unique: true })
  ruleCode!: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 200 })
  ruleName!: string;

  @Column({ name: 'trigger_event', type: 'varchar', length: 40 })
  triggerEvent!: XiaolongxiaRewardTrigger;

  // V1: POINTS only. reward_value is a points count, never money.
  @Column({ name: 'reward_type', type: 'varchar', length: 40, default: XiaolongxiaRewardType.Points })
  rewardType!: XiaolongxiaRewardType;

  @Column({ name: 'reward_value', type: 'decimal', precision: 12, scale: 2 })
  rewardValue!: string;

  @Column({ name: 'max_per_user_per_day', type: 'int', nullable: true })
  maxPerUserPerDay?: number | null;

  @Column({ name: 'daily_total_limit', type: 'int', nullable: true })
  dailyTotalLimit?: number | null;

  @Column({ name: 'effective_from', type: 'timestamp', nullable: true })
  effectiveFrom?: Date | null;

  @Column({ name: 'effective_to', type: 'timestamp', nullable: true })
  effectiveTo?: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 24, default: XiaolongxiaRewardRuleStatus.Draft })
  status!: XiaolongxiaRewardRuleStatus;

  @Column({ name: 'requires_review', type: 'boolean', default: true })
  requiresReview!: boolean;
}
