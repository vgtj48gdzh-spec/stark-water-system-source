import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';

@Entity({ name: 'water_agent_inventory' })
@Index(['agentId', 'servicePointId', 'skuCode'])
export class WaterAgentInventoryEntity extends WaterBaseEntity {
  @Column({ name: 'agent_id', type: 'varchar', length: 64, nullable: true })
  agentId?: string | null;

  @Column({ name: 'service_point_id', type: 'varchar', length: 64, nullable: true })
  servicePointId?: string | null;

  @Column({ name: 'sku_code', type: 'varchar', length: 64, default: 'barrel_water_18l' })
  skuCode!: string;

  @Column({ name: 'quantity_on_hand', type: 'int', default: 0 })
  quantityOnHand!: number;

  @Column({ name: 'quantity_reserved', type: 'int', default: 0 })
  quantityReserved!: number;
}
