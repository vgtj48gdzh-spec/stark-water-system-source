import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterBarrelStatus } from '../common/water.enums';

@Entity({ name: 'water_barrels' })
@Index(['barrelCode'], { unique: true })
export class WaterBarrelEntity extends WaterBaseEntity {
  @Column({ name: 'barrel_code', type: 'varchar', length: 80 })
  barrelCode!: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 120, nullable: true })
  qrCode?: string | null;

  @Column({ name: 'rfid_code', type: 'varchar', length: 120, nullable: true })
  rfidCode?: string | null;

  @Column({ name: 'barrel_status', type: 'varchar', length: 40, default: WaterBarrelStatus.HqStock })
  barrelStatus!: WaterBarrelStatus;

  @Column({ name: 'current_holder_type', type: 'varchar', length: 40, nullable: true })
  currentHolderType?: string | null;

  @Column({ name: 'current_holder_id', type: 'varchar', length: 64, nullable: true })
  currentHolderId?: string | null;
}
