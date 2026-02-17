import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PaymentMethodType } from '../../../deposit/domain/enums/payment-method-type.enum';

@Entity('withdrawals')
export class WithdrawalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('bigint')
  amount: bigint; // USDC amount in minor units

  @Column('bigint')
  fiatAmount: bigint; // XOF amount in minor units

  @Column({ length: 3 })
  currency: string; // XOF

  @Column({ length: 20 })
  providerCode: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    default: PaymentMethodType.PUSH,
  })
  paymentMethodType: PaymentMethodType;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.INITIATED,
  })
  status: WithdrawalStatus;

  @Column({ nullable: true })
  providerTransactionId?: string;

  @Column({ nullable: true })
  providerReference?: string;

  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ nullable: true })
  blnkTransactionId?: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  exchangeRate?: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
