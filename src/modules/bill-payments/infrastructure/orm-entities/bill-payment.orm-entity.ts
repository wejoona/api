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
import { BillCategory, BillPaymentStatus } from '../../domain/types';
import { BillProviderOrmEntity } from './bill-provider.orm-entity';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';

@Entity('bill_payments')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['providerId', 'createdAt'])
export class BillPaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index()
  transactionId: string | null;

  @Column({ name: 'provider_id', type: 'uuid' })
  @Index()
  providerId: string;

  @Column({ type: 'varchar', length: 30 })
  @Index()
  category: BillCategory;

  @Column({ name: 'account_number', type: 'varchar', length: 100 })
  accountNumber: string;

  @Column({ name: 'meter_number', type: 'varchar', length: 100, nullable: true })
  meterNumber: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  fee: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  @Index()
  status: BillPaymentStatus;

  @Column({ name: 'receipt_number', type: 'varchar', length: 100, nullable: true, unique: true })
  @Index()
  receiptNumber: string | null;

  @Column({ name: 'provider_reference', type: 'varchar', length: 200, nullable: true })
  @Index()
  providerReference: string | null;

  @Column({ name: 'token_number', type: 'varchar', length: 100, nullable: true })
  tokenNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  units: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true, unique: true })
  @Index()
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  // Relations
  @ManyToOne(() => BillProviderOrmEntity)
  @JoinColumn({ name: 'provider_id' })
  provider?: BillProviderOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;
}
