import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { XiaolongxiaChannel, XiaolongxiaConversionType, XiaolongxiaPromoterType } from './xiaolongxia.enums';

/**
 * V1 design-stage skeleton. This entity is intentionally NOT registered in
 * src/modules/water/water.entities.ts or src/database/data-source.ts.
 * Registration requires owner approval and a reviewed migration first.
 *
 * Attribution rows are read-only references: they record that a conversion
 * (customer binding, order creation, ticket purchase, service-code binding)
 * can be attributed to a mini-game source and a promoter. They must never
 * mutate the referenced customer, order, ticket, or service-code records,
 * and they carry no money fields.
 */
@Entity({ name: 'water_xiaolongxia_game_attributions' })
@Index(['statDate', 'gameCode'])
@Index(['conversionType'])
@Index(['promoterType', 'promoterId'])
@Index(['customerId'])
export class WaterXiaolongxiaGameAttributionEntity extends WaterBaseEntity {
  // Attribution day, aligned with the daily source-stat rollup.
  @Column({ name: 'stat_date', type: 'date' })
  statDate!: string;

  @Column({ name: 'conversion_type', type: 'varchar', length: 40 })
  conversionType!: XiaolongxiaConversionType;

  @Column({ name: 'game_code', type: 'varchar', length: 80 })
  gameCode!: string;

  @Column({ name: 'channel', type: 'varchar', length: 40 })
  channel!: XiaolongxiaChannel;

  // UTM-like source detail; '' means "no detail", consistent with the
  // game source stat unique index.
  @Column({ name: 'source_detail', type: 'varchar', length: 200, default: '' })
  sourceDetail!: string;

  // Promoter attribution: who drove this conversion (optional).
  @Column({ name: 'promoter_type', type: 'varchar', length: 40, nullable: true })
  promoterType?: XiaolongxiaPromoterType | null;

  @Column({ name: 'promoter_id', type: 'varchar', length: 64, nullable: true })
  promoterId?: string | null;

  // Conversion targets. Reference-only columns; no foreign-key enforcement in
  // V1 and no writes back to the referenced tables.
  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string | null;

  @Column({ name: 'order_id', type: 'varchar', length: 64, nullable: true })
  orderId?: string | null;

  @Column({ name: 'ticket_id', type: 'varchar', length: 64, nullable: true })
  ticketId?: string | null;

  // Reserved for the V2.1 family service code; stays empty until that design
  // is approved and developed.
  @Column({ name: 'service_code_id', type: 'varchar', length: 64, nullable: true })
  serviceCodeId?: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt!: Date;
}
