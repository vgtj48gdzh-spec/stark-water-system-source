import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterAuditAction, WaterRole } from '../common/water.enums';

@Entity({ name: 'water_audit_logs' })
@Index(['actorId'])
@Index(['targetType', 'targetId'])
export class WaterAuditLogEntity extends WaterBaseEntity {
  @Column({ name: 'actor_id', type: 'varchar', length: 64 })
  actorId!: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 40 })
  actorRole!: WaterRole;

  @Column({ name: 'action', type: 'varchar', length: 80 })
  action!: WaterAuditAction | string;

  @Column({ name: 'target_type', type: 'varchar', length: 80 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 64, nullable: true })
  targetId?: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson?: Record<string, unknown> | null;

  @Column({ name: 'before_json', type: 'json', nullable: true })
  beforeJson?: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'json', nullable: true })
  afterJson?: Record<string, unknown> | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 80, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;
}
