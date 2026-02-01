import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';

@Entity('cards')
export class CardOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ name: 'card_number', type: 'varchar', length: 16 })
  cardNumber: string;

  @Column({ type: 'varchar', length: 3 })
  cvv: string;

  @Column({ name: 'expiry_month', type: 'varchar', length: 2 })
  expiryMonth: string;

  @Column({ name: 'expiry_year', type: 'varchar', length: 2 })
  expiryYear: string;

  @Column({ name: 'cardholder_name', type: 'varchar', length: 255 })
  cardholderName: string;

  @Column({
    name: 'card_type',
    type: 'varchar',
    length: 20,
    default: 'virtual',
  })
  @Index()
  cardType: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string;

  @Column({ name: 'spending_limit', type: 'decimal', precision: 18, scale: 2 })
  spendingLimit: number;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  spentAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'frozen_at', type: 'timestamp', nullable: true })
  frozenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;
}
