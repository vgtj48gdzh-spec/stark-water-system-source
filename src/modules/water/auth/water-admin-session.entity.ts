import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_admin_sessions' })
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class WaterAdminSessionEntity extends WaterBaseEntity {
  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 80, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;
}
