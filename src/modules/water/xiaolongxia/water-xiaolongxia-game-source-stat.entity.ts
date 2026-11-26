import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { XiaolongxiaChannel } from './xiaolongxia.enums';

/**
 * V1 design-stage skeleton. This entity is intentionally NOT registered in
 * src/modules/water/water.entities.ts or src/database/data-source.ts.
 * Registration requires owner approval and a reviewed migration first.
 */
@Entity({ name: 'water_xiaolongxia_game_source_stats' })
@Index(['statDate', 'gameCode', 'channel', 'sourceDetail'], { unique: true })
export class WaterXiaolongxiaGameSourceStatEntity extends WaterBaseEntity {
  @Column({ name: 'stat_date', type: 'date' })
  statDate!: string;

  @Column({ name: 'game_code', type: 'varchar', length: 80 })
  gameCode!: string;

  @Column({ name: 'game_name', type: 'varchar', length: 200, nullable: true })
  gameName?: string | null;

  @Column({ name: 'channel', type: 'varchar', length: 40 })
  channel!: XiaolongxiaChannel;

  // UTM-like source detail, for example a poster code or group label.
  // Non-nullable with '' default so the unique index covers "no detail" rows
  // (NULL would bypass MySQL unique-index dedupe).
  @Column({ name: 'source_detail', type: 'varchar', length: 200, default: '' })
  sourceDetail!: string;

  // Pure counters only; no money fields by design.
  @Column({ name: 'visit_count', type: 'int', default: 0 })
  visitCount!: number;

  @Column({ name: 'player_count', type: 'int', default: 0 })
  playerCount!: number;

  @Column({ name: 'share_count', type: 'int', default: 0 })
  shareCount!: number;

  @Column({ name: 'new_visitor_count', type: 'int', default: 0 })
  newVisitorCount!: number;
}
