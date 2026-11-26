import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterPaymentStatus } from '../common/water.enums';

@Entity({ name: 'water_agent_purchase_orders' })
@Index(['agentId'])
export class WaterAgentPurchaseOrderEntity extends WaterBaseEntity {
  @Column({ name: 'agent_id', type: 'varchar', length: 64 })
  agentId!: string;

  @Column({ name: 'purchase_order_no', type: 'varchar', length: 80 })
  purchaseOrderNo!: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'payment_status', type: 'varchar', length: 40, default: WaterPaymentStatus.Unpaid })
  paymentStatus!: WaterPaymentStatus;

  @Column({ name: 'shipment_status', type: 'varchar', length: 40, default: 'PENDING' })
  shipmentStatus!: string;
}
