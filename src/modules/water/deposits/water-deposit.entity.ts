import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { WaterDepositType } from '../common/water.enums';

@Entity({ name: 'water_deposits' })
@Index(['ownerType', 'ownerId'])
export class WaterDepositEntity extends WaterBaseEntity {
  @Column({ name: 'deposit_type', type: 'varchar', length: 60 })
  depositType!: WaterDepositType;

  @Column({ name: 'owner_type', type: 'varchar', length: 40 })
  ownerType!: string;

  @Column({ name: 'owner_id', type: 'varchar', length: 64 })
  ownerId!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 12, scale: 2 })
  balanceAmount!: string;

  @Column({ name: 'deposit_status', type: 'varchar', length: 40, default: 'HELD' })
  depositStatus!: string;
}
