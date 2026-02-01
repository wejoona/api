import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';

@Entity('bulk_payments')
export class BulkPaymentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ name: 'total_recipients', type: 'integer' })
  totalRecipients: number;

  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  @Index()
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;

  @OneToMany(() => BulkPaymentItemOrmEntity, (item) => item.bulkPayment)
  items?: BulkPaymentItemOrmEntity[];
}

@Entity('bulk_payment_items')
export class BulkPaymentItemOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'bulk_payment_id', type: 'uuid' })
  @Index()
  bulkPaymentId: string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20 })
  recipientPhone: string;

  @Column({
    name: 'recipient_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recipientName: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  @Index()
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index()
  transactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @ManyToOne(() => BulkPaymentOrmEntity, (bulkPayment) => bulkPayment.items)
  @JoinColumn({ name: 'bulk_payment_id' })
  bulkPayment?: BulkPaymentOrmEntity;
}
