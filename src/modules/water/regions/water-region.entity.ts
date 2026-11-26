import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_regions' })
@Index(['regionCode'], { unique: true })
export class WaterRegionEntity extends WaterBaseEntity {
  @Column({ name: 'parent_region_id', type: 'varchar', length: 64, nullable: true })
  parentRegionId?: string | null;

  @Column({ name: 'region_name', type: 'varchar', length: 120 })
  regionName!: string;

  @Column({ name: 'region_code', type: 'varchar', length: 64 })
  regionCode!: string;

  @Column({ name: 'manager_user_id', type: 'varchar', length: 64, nullable: true })
  managerUserId?: string | null;
}
