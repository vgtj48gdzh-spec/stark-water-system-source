import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterPaymentStatus, WaterTicketPaymentMethod, WaterTicketStatus } from '../common/water.enums';

@Entity({ name: 'water_tickets' })
@Index(['customerId'])
export class WaterTicketEntity extends WaterBaseEntity {
  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'ticket_batch_no', type: 'varchar', length: 80 })
  ticketBatchNo!: string;

  @Column({ name: 'total_quantity', type: 'int' })
  totalQuantity!: number;

  @Column({ name: 'remaining_quantity', type: 'int' })
  remainingQuantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 40, nullable: true })
  paymentMethod?: WaterTicketPaymentMethod | null;

  @Column({ name: 'payment_status', type: 'varchar', length: 40, default: WaterPaymentStatus.Confirmed })
  paymentStatus!: WaterPaymentStatus;

  @Column({ name: 'ticket_status', type: 'varchar', length: 40, default: WaterTicketStatus.Active })
  ticketStatus!: WaterTicketStatus;

  @Column({ name: 'confirmed_by', type: 'varchar', length: 64, nullable: true })
  confirmedBy?: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;
}
