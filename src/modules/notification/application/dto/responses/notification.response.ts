import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationStatus,
} from '@modules/notification/infrastructure/orm-entities/notification.orm-entity';
import {
  NotificationPresentationType,
  NotificationSeverity,
} from '../../domain/mappers/notification-presentation.mapper';

export class NotificationResponse {
  @ApiProperty({
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Notification type',
    enum: [
      'transfer_received',
      'transfer_sent',
      'transfer_failed',
      'deposit_completed',
      'deposit_failed',
      'withdrawal_completed',
      'withdrawal_failed',
      'kyc_approved',
      'kyc_rejected',
      'low_balance',
      'system',
      'promotional',
    ],
    example: 'transfer_received',
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Stable mobile display type derived from backend type',
    enum: [
      'transactionComplete',
      'transactionFailed',
      'securityAlert',
      'promotion',
      'lowBalance',
      'general',
      'transfer',
      'deposit',
      'withdrawal',
      'security',
      'kyc',
      'newDeviceLogin',
      'largeTransaction',
      'withdrawalPending',
      'addressWhitelisted',
      'priceAlert',
      'weeklySpendingSummary',
    ],
    example: 'transfer',
  })
  presentationType: NotificationPresentationType;

  @ApiProperty({
    description: 'Stable severity for mobile color and priority treatment',
    enum: ['info', 'success', 'warning', 'critical'],
    example: 'success',
  })
  severity: NotificationSeverity;

  @ApiProperty({
    description: 'Stable mobile action target for notification taps',
    enum: [
      'open_transaction',
      'open_kyc',
      'open_security',
      'open_wallet',
      'none',
    ],
    example: 'open_transaction',
  })
  action: 'open_transaction' | 'open_kyc' | 'open_security' | 'open_wallet' | 'none';

  @ApiProperty({
    description: 'Notification status',
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    example: 'sent',
  })
  status: NotificationStatus;

  @ApiProperty({
    description: 'Notification title',
    example: 'Payment Received',
  })
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'You received $50.00 from John Doe',
  })
  body: string;

  @ApiProperty({
    description: 'Additional notification data',
    example: { amount: '50.00', sender: 'John Doe' },
  })
  data: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Reference type (e.g., transaction, wallet)',
    example: 'transaction',
  })
  referenceType: string | null;

  @ApiPropertyOptional({
    description: 'Reference ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  referenceId: string | null;

  @ApiPropertyOptional({
    description: 'When notification was sent',
    example: '2026-01-23T10:30:00.000Z',
  })
  sentAt: Date | null;

  @ApiPropertyOptional({
    description: 'When notification was delivered',
    example: '2026-01-23T10:30:05.000Z',
  })
  deliveredAt: Date | null;

  @ApiPropertyOptional({
    description: 'When notification was read',
    example: '2026-01-23T10:35:00.000Z',
  })
  readAt: Date | null;

  @ApiProperty({
    description: 'When notification was created',
    example: '2026-01-23T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Whether notification is unread',
    example: false,
  })
  isUnread: boolean;
}
