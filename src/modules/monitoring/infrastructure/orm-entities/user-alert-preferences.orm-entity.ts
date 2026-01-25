/**
 * User Alert Preferences ORM Entity
 * Database entity for user alert configuration
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';

@Entity('user_alert_preferences')
export class UserAlertPreferencesOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Notification channels
  @Column({ name: 'email_alerts', type: 'boolean', default: true })
  emailAlerts: boolean;

  @Column({ name: 'push_alerts', type: 'boolean', default: true })
  pushAlerts: boolean;

  @Column({ name: 'sms_alerts', type: 'boolean', default: false })
  smsAlerts: boolean;

  // Thresholds
  @Column({ name: 'large_transaction_threshold', type: 'decimal', precision: 18, scale: 2, default: 1000 })
  largeTransactionThreshold: number;

  @Column({ name: 'balance_low_threshold', type: 'decimal', precision: 18, scale: 2, default: 10 })
  balanceLowThreshold: number;

  @Column({ name: 'balance_high_threshold', type: 'decimal', precision: 18, scale: 2, nullable: true })
  balanceHighThreshold: number | null;

  @Column({ name: 'daily_limit_threshold', type: 'decimal', precision: 18, scale: 2, nullable: true, default: 5000 })
  dailyLimitThreshold: number | null;

  // Alert type subscriptions (stored as JSON array)
  @Column({ name: 'alert_types', type: 'jsonb', default: '[]' })
  alertTypes: string[];

  // Quiet hours
  @Column({ name: 'quiet_hours_enabled', type: 'boolean', default: false })
  quietHoursEnabled: boolean;

  @Column({ name: 'quiet_hours_start', type: 'varchar', length: 5, nullable: true })
  quietHoursStart: string | null;

  @Column({ name: 'quiet_hours_end', type: 'varchar', length: 5, nullable: true })
  quietHoursEnd: string | null;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  // Settings
  @Column({ name: 'instant_critical_alerts', type: 'boolean', default: true })
  instantCriticalAlerts: boolean;

  @Column({ name: 'digest_frequency', type: 'varchar', length: 20, default: 'realtime' })
  digestFrequency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
