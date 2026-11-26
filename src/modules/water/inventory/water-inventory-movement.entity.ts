import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterInventoryMovementType } from '../common/water.enums';

@Entity({ name: 'water_inventory_movements' })
@Index(['movementType'])
export class WaterInventoryMovementEntity extends WaterBaseEntity {
  @Column({ name: 'movement_type', type: 'varchar', length: 60 })
  movementType!: WaterInventoryMovementType;

  @Column({ name: 'agent_id', type: 'varchar', length: 64, nullable: true })
  agentId?: string | null;

  @Column({ name: 'service_point_id', type: 'varchar', length: 64, nullable: true })
  servicePointId?: string | null;

  @Column({ name: 'sku_code', type: 'varchar', length: 64, default: 'barrel_water_18l' })
  skuCode!: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity!: number;

  @Column({ name: 'related_order_id', type: 'varchar', length: 64, nullable: true })
  relatedOrderId?: string | null;

  @Column({ name: 'related_purchase_order_id', type: 'varchar', length: 64, nullable: true })
  relatedPurchaseOrderId?: string | null;
}
