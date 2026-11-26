import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterBusinessEventType } from '../common/water.enums';

@Entity({ name: 'water_business_events' })
@Index(['eventId'], { unique: true })
@Index(['idempotencyKey'], { unique: true })
export class WaterBusinessEventEntity extends WaterBaseEntity {
  @Column({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 120 })
  eventType!: WaterBusinessEventType;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 80 })
  aggregateType!: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 64 })
  aggregateId!: string;

  @Column({ name: 'payload_json', type: 'json' })
  payloadJson!: Record<string, unknown>;

  @Column({ name: 'event_version', type: 'int', default: 1 })
  eventVersion!: number;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt!: Date;

  @Column({ name: 'sync_attempts', type: 'int', default: 0 })
  syncAttempts!: number;

  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError?: string | null;
}
