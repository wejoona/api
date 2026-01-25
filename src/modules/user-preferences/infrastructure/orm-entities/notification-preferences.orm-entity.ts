import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';

@Entity('notification_preferences')
export class NotificationPreferencesOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserOrmEntity;

  // Push notification settings
  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'push_transactions', type: 'boolean', default: true })
  pushTransactions: boolean;

  @Column({ name: 'push_security', type: 'boolean', default: true })
  pushSecurity: boolean;

  @Column({ name: 'push_marketing', type: 'boolean', default: false })
  pushMarketing: boolean;

  // Email notification settings
  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ name: 'email_transactions', type: 'boolean', default: true })
  emailTransactions: boolean;

  @Column({ name: 'email_monthly_statement', type: 'boolean', default: true })
  emailMonthlyStatement: boolean;

  @Column({ name: 'email_marketing', type: 'boolean', default: false })
  emailMarketing: boolean;

  // SMS notification settings
  @Column({ name: 'sms_enabled', type: 'boolean', default: true })
  smsEnabled: boolean;

  @Column({ name: 'sms_transactions', type: 'boolean', default: true })
  smsTransactions: boolean;

  @Column({ name: 'sms_security', type: 'boolean', default: true })
  smsSecurity: boolean;

  // Thresholds
  @Column({
    name: 'large_transaction_threshold',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 1000,
  })
  largeTransactionThreshold: number;

  @Column({
    name: 'low_balance_threshold',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 100,
  })
  lowBalanceThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
