import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type NotificationType =
  | 'transfer_received'
  | 'transfer_sent'
  | 'transfer_failed'
  | 'transfer_complete'
  | 'deposit_completed'
  | 'deposit_complete'
  | 'deposit_failed'
  | 'withdrawal_completed'
  | 'withdrawal_complete'
  | 'withdrawal_failed'
  | 'withdrawal_pending'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'kyc_update'
  | 'low_balance'
  | 'system'
  | 'promotional'
  // Security notifications
  | 'new_device_login'
  | 'large_transaction'
  | 'address_whitelisted'
  | 'security_alert'
  // Insights
  | 'price_alert'
  | 'weekly_summary';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

@Entity('notifications')
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: [
      'transfer_received',
      'transfer_sent',
      'transfer_failed',
      'transfer_complete',
      'deposit_completed',
      'deposit_complete',
      'deposit_failed',
      'withdrawal_completed',
      'withdrawal_complete',
      'withdrawal_failed',
      'withdrawal_pending',
      'kyc_approved',
      'kyc_rejected',
      'kyc_update',
      'low_balance',
      'system',
      'promotional',
      'new_device_login',
      'large_transaction',
      'address_whitelisted',
      'security_alert',
      'price_alert',
      'weekly_summary',
    ],
  })
  @Index()
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
  })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: '{}' })
  data: Record<string, unknown>;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  @Index()
  referenceId: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
