import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterTicketTransactionType } from '../common/water.enums';

@Entity({ name: 'water_ticket_transactions' })
@Index(['ticketId'])
export class WaterTicketTransactionEntity extends WaterBaseEntity {
  @Column({ name: 'ticket_id', type: 'varchar', length: 64, nullable: true })
  ticketId?: string | null;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 40 })
  transactionType!: WaterTicketTransactionType;

  @Column({ name: 'quantity', type: 'int' })
  quantity!: number;

  @Column({ name: 'related_order_id', type: 'varchar', length: 64, nullable: true })
  relatedOrderId?: string | null;
}
