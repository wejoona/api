import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { UpdateNotificationPreferencesProps } from '../../domain/entities';

type MobilePreferenceChannels = {
  push?: boolean;
  email?: boolean;
  sms?: boolean;
};

type MobilePreferenceCategories = {
  transaction?: boolean;
  security?: boolean;
  marketing?: boolean;
  system?: boolean;
};

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Mobile grouped channel toggles compatibility payload',
    example: { push: true, email: true, sms: true },
    required: false,
  })
  @IsObject()
  @IsOptional()
  channels?: MobilePreferenceChannels;

  @ApiProperty({
    description: 'Mobile grouped notification categories compatibility payload',
    example: {
      transaction: true,
      security: true,
      marketing: false,
      system: true,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  categories?: MobilePreferenceCategories;

  // Push notification settings
  @ApiProperty({
    description: 'Enable/disable all push notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiProperty({
    description: 'Enable push notifications for transactions',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushTransactions?: boolean;

  @ApiProperty({
    description: 'Enable push notifications for security alerts',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushSecurity?: boolean;

  @ApiProperty({
    description: 'Enable push notifications for marketing/promotions',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushMarketing?: boolean;

  // Email notification settings
  @ApiProperty({
    description: 'Enable/disable all email notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiProperty({
    description: 'Enable email receipts for transactions',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailTransactions?: boolean;

  @ApiProperty({
    description: 'Enable monthly statement emails',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailMonthlyStatement?: boolean;

  @ApiProperty({
    description: 'Enable marketing/newsletter emails',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailMarketing?: boolean;

  // SMS notification settings
  @ApiProperty({
    description:
      'Enable/disable SMS notifications (security SMS cannot be disabled)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiProperty({
    description: 'Enable SMS notifications for transactions',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  smsTransactions?: boolean;

  @ApiProperty({
    description:
      'Enable SMS for security codes (cannot be disabled for security)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  smsSecurity?: boolean;

  // Thresholds
  @ApiProperty({
    description: 'Threshold amount (USDC) for large transaction alerts',
    example: 1000,
    required: false,
    minimum: 0,
    maximum: 1000000,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1000000)
  largeTransactionThreshold?: number;

  @ApiProperty({
    description: 'Threshold amount (USDC) for low balance alerts',
    example: 100,
    required: false,
    minimum: 0,
    maximum: 100000,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100000)
  lowBalanceThreshold?: number;

  toUpdateProps(): UpdateNotificationPreferencesProps {
    const update: UpdateNotificationPreferencesProps = {
      pushEnabled: this.pushEnabled,
      pushTransactions: this.pushTransactions,
      pushSecurity: this.pushSecurity,
      pushMarketing: this.pushMarketing,
      emailEnabled: this.emailEnabled,
      emailTransactions: this.emailTransactions,
      emailMonthlyStatement: this.emailMonthlyStatement,
      emailMarketing: this.emailMarketing,
      smsEnabled: this.smsEnabled,
      smsTransactions: this.smsTransactions,
      smsSecurity: this.smsSecurity,
      largeTransactionThreshold: this.largeTransactionThreshold,
      lowBalanceThreshold: this.lowBalanceThreshold,
    };

    if (this.channels?.push !== undefined)
      update.pushEnabled = this.channels.push;
    if (this.channels?.email !== undefined)
      update.emailEnabled = this.channels.email;
    if (this.channels?.sms !== undefined) update.smsEnabled = this.channels.sms;

    if (this.categories?.transaction !== undefined) {
      update.pushTransactions = this.categories.transaction;
      update.emailTransactions = this.categories.transaction;
      update.smsTransactions = this.categories.transaction;
    }
    if (this.categories?.security !== undefined) {
      update.pushSecurity = this.categories.security;
      update.smsSecurity = this.categories.security;
    }
    if (this.categories?.marketing !== undefined) {
      update.pushMarketing = this.categories.marketing;
      update.emailMarketing = this.categories.marketing;
    }
    if (this.categories?.system !== undefined) {
      update.emailMonthlyStatement = this.categories.system;
    }

    return Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined),
    ) as UpdateNotificationPreferencesProps;
  }
}
