import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';
import { PaymentRequestOrmEntity } from './payment-request.orm-entity';
import { MerchantPaymentOrmEntity } from './merchant-payment.orm-entity';

@Entity('merchants')
export class MerchantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_name', type: 'varchar', length: 255 })
  @Index()
  businessName: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  @Index()
  ownerId: string;

  @Column({
    type: 'enum',
    enum: [
      'retail',
      'restaurant',
      'grocery',
      'transport',
      'services',
      'healthcare',
      'education',
      'entertainment',
      'other',
    ],
    default: 'other',
  })
  category: string;

  @Column({ type: 'varchar', length: 2 })
  @Index()
  country: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ name: 'qr_code', type: 'text' })
  qrCode: string;

  @Column({ name: 'qr_code_url', type: 'varchar', length: 500, nullable: true })
  qrCodeUrl: string | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  @Index()
  isVerified: boolean;

  @Column({
    name: 'fee_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.5,
  })
  feePercent: number;

  @Column({
    name: 'daily_limit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 10000,
  })
  dailyLimit: number;

  @Column({
    name: 'monthly_limit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 100000,
  })
  monthlyLimit: number;

  @Column({
    name: 'daily_volume',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  dailyVolume: number;

  @Column({
    name: 'monthly_volume',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  monthlyVolume: number;

  @Column({ name: 'total_transactions', type: 'int', default: 0 })
  totalTransactions: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'pending',
  })
  @Index()
  status: string;

  @Column({
    name: 'business_address',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  businessAddress: string | null;

  @Column({
    name: 'business_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  businessPhone: string | null;

  @Column({
    name: 'business_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  businessEmail: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true })
  webhookUrl: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'owner_id' })
  owner?: UserOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;

  @OneToMany(() => PaymentRequestOrmEntity, (pr) => pr.merchant)
  paymentRequests?: PaymentRequestOrmEntity[];

  @OneToMany(() => MerchantPaymentOrmEntity, (mp) => mp.merchant)
  payments?: MerchantPaymentOrmEntity[];
}
