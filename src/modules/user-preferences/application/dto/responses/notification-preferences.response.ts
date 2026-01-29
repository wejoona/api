import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreferences } from '../../domain/entities';

export class NotificationPreferencesResponse {
  @ApiProperty({ description: 'Preferences ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  // Push notification settings
  @ApiProperty({ description: 'Push notifications enabled' })
  pushEnabled: boolean;

  @ApiProperty({ description: 'Push notifications for transactions' })
  pushTransactions: boolean;

  @ApiProperty({ description: 'Push notifications for security alerts' })
  pushSecurity: boolean;

  @ApiProperty({ description: 'Push notifications for marketing' })
  pushMarketing: boolean;

  // Email notification settings
  @ApiProperty({ description: 'Email notifications enabled' })
  emailEnabled: boolean;

  @ApiProperty({ description: 'Email receipts for transactions' })
  emailTransactions: boolean;

  @ApiProperty({ description: 'Monthly statement emails' })
  emailMonthlyStatement: boolean;

  @ApiProperty({ description: 'Marketing emails' })
  emailMarketing: boolean;

  // SMS notification settings
  @ApiProperty({ description: 'SMS notifications enabled' })
  smsEnabled: boolean;

  @ApiProperty({ description: 'SMS for transaction alerts' })
  smsTransactions: boolean;

  @ApiProperty({ description: 'SMS for security codes (always enabled)' })
  smsSecurity: boolean;

  // Thresholds
  @ApiProperty({ description: 'Large transaction alert threshold (USDC)' })
  largeTransactionThreshold: number;

  @ApiProperty({ description: 'Low balance alert threshold (USDC)' })
  lowBalanceThreshold: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: string;

  static fromDomain(
    preferences: NotificationPreferences,
  ): NotificationPreferencesResponse {
    const response = new NotificationPreferencesResponse();
    response.id = preferences.id;
    response.userId = preferences.userId;
    response.pushEnabled = preferences.pushEnabled;
    response.pushTransactions = preferences.pushTransactions;
    response.pushSecurity = preferences.pushSecurity;
    response.pushMarketing = preferences.pushMarketing;
    response.emailEnabled = preferences.emailEnabled;
    response.emailTransactions = preferences.emailTransactions;
    response.emailMonthlyStatement = preferences.emailMonthlyStatement;
    response.emailMarketing = preferences.emailMarketing;
    response.smsEnabled = preferences.smsEnabled;
    response.smsTransactions = preferences.smsTransactions;
    response.smsSecurity = preferences.smsSecurity;
    response.largeTransactionThreshold = preferences.largeTransactionThreshold;
    response.lowBalanceThreshold = preferences.lowBalanceThreshold;
    response.createdAt = preferences.createdAt.toISOString();
    response.updatedAt = preferences.updatedAt.toISOString();
    return response;
  }
}
