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

@Entity('payment_requests')
export class PaymentRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 20, unique: true })
  @Index()
  requestId: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  @Index()
  merchantId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'expired', 'cancelled'],
    default: 'pending',
  })
  @Index()
  status: string;

  @Column({ name: 'qr_data', type: 'text' })
  qrData: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'payment_id', type: 'varchar', length: 50, nullable: true })
  paymentId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => MerchantOrmEntity, (m) => m.paymentRequests)
  @JoinColumn({ name: 'merchant_id' })
  merchant?: MerchantOrmEntity;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'customer_id' })
  customer?: UserOrmEntity;
}
