import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterRole } from '../common/water.enums';

@Entity({ name: 'water_admin_users' })
@Index(['username'], { unique: true })
@Index(['role'])
@Index(['status'])
export class WaterAdminUserEntity extends WaterBaseEntity {
  @Column({ name: 'username', type: 'varchar', length: 80 })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120, nullable: true })
  displayName?: string | null;

  @Column({ name: 'role', type: 'varchar', length: 40 })
  role!: WaterRole;

  @Column({ name: 'status', type: 'varchar', length: 24, default: 'ACTIVE' })
  status!: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date | null;
}
