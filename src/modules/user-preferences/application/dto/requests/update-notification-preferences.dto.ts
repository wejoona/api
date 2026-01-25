import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateNotificationPreferencesDto {
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
    description: 'Enable/disable SMS notifications (security SMS cannot be disabled)',
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
    description: 'Enable SMS for security codes (cannot be disabled for security)',
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
}
