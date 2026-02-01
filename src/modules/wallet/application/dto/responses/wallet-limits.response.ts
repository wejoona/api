import { ApiProperty } from '@nestjs/swagger';

export class WalletLimitsResponse {
  @ApiProperty({
    example: 500.0,
    description: 'Maximum daily transaction limit',
  })
  dailyLimit: number;

  @ApiProperty({
    example: 2000.0,
    description: 'Maximum monthly transaction limit',
  })
  monthlyLimit: number;

  @ApiProperty({
    example: 500.0,
    description: 'Maximum single transaction limit',
  })
  singleTransactionLimit: number;

  @ApiProperty({
    example: 500.0,
    description: 'Maximum daily withdrawal limit',
  })
  withdrawalLimit: number;

  @ApiProperty({
    example: 420.0,
    description: 'Amount used today',
  })
  dailyUsed: number;

  @ApiProperty({
    example: 1250.0,
    description: 'Amount used this month',
  })
  monthlyUsed: number;

  @ApiProperty({
    example: 1,
    description:
      'KYC tier level (0=Unverified, 1=Basic, 2=Verified, 3=Premium)',
  })
  kycTier: number;

  @ApiProperty({
    example: 'Basic',
    description: 'Current tier name',
  })
  tierName: string;

  @ApiProperty({
    example: 'Verified',
    description: 'Next tier name',
    nullable: true,
  })
  nextTierName: string | null;

  @ApiProperty({
    example: 2000.0,
    description: 'Daily limit for next tier',
    nullable: true,
  })
  nextTierDailyLimit: number | null;

  @ApiProperty({
    example: 10000.0,
    description: 'Monthly limit for next tier',
    nullable: true,
  })
  nextTierMonthlyLimit: number | null;

  @ApiProperty({
    example: '2026-01-31T00:00:00.000Z',
    description: 'When limits reset',
  })
  resetTime: string;

  @ApiProperty({
    example: 12,
    description: 'Hours until daily limit resets',
  })
  hoursUntilReset: number;

  @ApiProperty({
    example: 30,
    description: 'Minutes until daily limit resets',
  })
  minutesUntilReset: number;
}
