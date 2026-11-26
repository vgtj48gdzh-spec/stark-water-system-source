import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterDeliveryStatus, WaterOrderStatus, WaterPaymentStatus } from '../common/water.enums';

@Entity({ name: 'water_orders' })
@Index(['customerId'])
export class WaterOrderEntity extends WaterBaseEntity {
  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'address_id', type: 'varchar', length: 64, nullable: true })
  addressId?: string | null;

  @Column({ name: 'order_status', type: 'varchar', length: 40, default: WaterOrderStatus.Draft })
  orderStatus!: WaterOrderStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 40, default: WaterPaymentStatus.Unpaid })
  paymentStatus!: WaterPaymentStatus;

  @Column({ name: 'delivery_status', type: 'varchar', length: 40, default: WaterDeliveryStatus.Pending })
  deliveryStatus!: WaterDeliveryStatus;

  @Column({ name: 'agent_id', type: 'varchar', length: 64, nullable: true })
  agentId?: string | null;

  @Column({ name: 'service_point_id', type: 'varchar', length: 64, nullable: true })
  servicePointId?: string | null;

  @Column({ name: 'delivery_staff_id', type: 'varchar', length: 64, nullable: true })
  deliveryStaffId?: string | null;

  @Column({ name: 'ticket_quantity_to_use', type: 'int', default: 0 })
  ticketQuantityToUse!: number;

  @Column({ name: 'barrel_quantity_to_return', type: 'int', default: 0 })
  barrelQuantityToReturn!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: string;
}
