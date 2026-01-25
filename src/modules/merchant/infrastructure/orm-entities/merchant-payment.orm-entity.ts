import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MerchantOrmEntity } from './merchant.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';

@Entity('merchant_payments')
export class MerchantPaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'varchar', length: 20, unique: true })
  @Index()
  paymentId: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  @Index()
  merchantId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ name: 'customer_wallet_id', type: 'uuid' })
  customerWalletId: string;

  @Column({ name: 'merchant_wallet_id', type: 'uuid' })
  merchantWalletId: string;

  @Column({ name: 'payment_request_id', type: 'uuid', nullable: true })
  @Index()
  paymentRequestId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fee: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 15, scale: 2 })
  netAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  reference: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['completed', 'refunded', 'failed'],
    default: 'completed',
  })
  @Index()
  status: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 255, nullable: true })
  txHash: string | null;

  @Column({
    name: 'ledger_transaction_id',
    type: 'uuid',
    nullable: true,
  })
  ledgerTransactionId: string | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column({
    name: 'refund_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  refundReason: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => MerchantOrmEntity, (m) => m.payments)
  @JoinColumn({ name: 'merchant_id' })
  merchant?: MerchantOrmEntity;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'customer_id' })
  customer?: UserOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'customer_wallet_id' })
  customerWallet?: WalletOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'merchant_wallet_id' })
  merchantWallet?: WalletOrmEntity;
}
