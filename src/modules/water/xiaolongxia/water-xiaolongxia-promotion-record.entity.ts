import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { XiaolongxiaChannel, XiaolongxiaPromoterType } from './xiaolongxia.enums';

/**
 * V1 design-stage skeleton. This entity is intentionally NOT registered in
 * src/modules/water/water.entities.ts or src/database/data-source.ts.
 * Registration requires owner approval and a reviewed migration first.
 */
@Entity({ name: 'water_xiaolongxia_promotion_records' })
@Index(['promoterType', 'promoterId'])
@Index(['channel'])
@Index(['campaignCode'])
export class WaterXiaolongxiaPromotionRecordEntity extends WaterBaseEntity {
  @Column({ name: 'promoter_type', type: 'varchar', length: 40 })
  promoterType!: XiaolongxiaPromoterType;

  @Column({ name: 'promoter_id', type: 'varchar', length: 64, nullable: true })
  promoterId?: string | null;

  @Column({ name: 'channel', type: 'varchar', length: 40 })
  channel!: XiaolongxiaChannel;

  @Column({ name: 'campaign_code', type: 'varchar', length: 80, nullable: true })
  campaignCode?: string | null;

  @Column({ name: 'knowledge_entry_id', type: 'varchar', length: 64, nullable: true })
  knowledgeEntryId?: string | null;

  @Column({ name: 'content_summary', type: 'varchar', length: 500, nullable: true })
  contentSummary?: string | null;

  // Pure counters only. No order amount, price, ticket balance, deposit, or
  // refund field is allowed on this table by design.
  @Column({ name: 'share_count', type: 'int', default: 0 })
  shareCount!: number;

  @Column({ name: 'click_count', type: 'int', default: 0 })
  clickCount!: number;

  @Column({ name: 'promoted_at', type: 'timestamp', nullable: true })
  promotedAt?: Date | null;
}
