import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_barrel_movements' })
@Index(['barrelId'])
export class WaterBarrelMovementEntity extends WaterBaseEntity {
  @Column({ name: 'barrel_id', type: 'varchar', length: 64 })
  barrelId!: string;

  @Column({ name: 'movement_type', type: 'varchar', length: 60 })
  movementType!: string;

  @Column({ name: 'from_holder_type', type: 'varchar', length: 40, nullable: true })
  fromHolderType?: string | null;

  @Column({ name: 'from_holder_id', type: 'varchar', length: 64, nullable: true })
  fromHolderId?: string | null;

  @Column({ name: 'to_holder_type', type: 'varchar', length: 40, nullable: true })
  toHolderType?: string | null;

  @Column({ name: 'to_holder_id', type: 'varchar', length: 64, nullable: true })
  toHolderId?: string | null;
}
