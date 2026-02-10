import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DepositStatus } from '../enums/deposit-status.enum';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

@Entity('deposits')
export class DepositEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('bigint')
  amount: bigint; // in minor units (centimes)

  @Column({ length: 3 })
  currency: string;

  @Column({ length: 20 })
  providerCode: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
  })
  paymentMethodType: PaymentMethodType;

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.INITIATED,
  })
  status: DepositStatus;

  @Column({ nullable: true })
  providerTransactionId?: string;

  @Column({ nullable: true })
  providerReference?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ nullable: true })
  blnkTransactionId?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}