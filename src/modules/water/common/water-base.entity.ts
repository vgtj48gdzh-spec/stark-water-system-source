import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WaterSyncStatus } from './water.enums';

export abstract class WaterBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 64, unique: true })
  externalId!: string;

  @Column({ name: 'hq_id', type: 'varchar', length: 64, nullable: true })
  hqId?: string | null;

  @Column({ name: 'source_system', type: 'varchar', length: 32, default: 'water' })
  sourceSystem!: string;

  @Column({
    name: 'sync_status',
    type: 'varchar',
    length: 24,
    default: WaterSyncStatus.Pending,
  })
  syncStatus!: WaterSyncStatus;

  @Column({ name: 'sync_error', type: 'text', nullable: true })
  syncError?: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160, nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'company_id', type: 'varchar', length: 64, nullable: true })
  companyId?: string | null;

  @Column({ name: 'region_id', type: 'varchar', length: 64, nullable: true })
  regionId?: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64, nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string | null;
}
