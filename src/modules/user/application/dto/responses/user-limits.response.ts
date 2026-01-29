import { ApiProperty } from '@nestjs/swagger';

export type UserTier = 'basic' | 'verified' | 'premium';
export type KycStatusType = 'none' | 'pending' | 'verified';

class LimitDetail {
  @ApiProperty({ example: 1000, description: 'Maximum limit amount' })
  limit: number;

  @ApiProperty({ example: 250, description: 'Amount already used' })
  used: number;

  @ApiProperty({ example: 750, description: 'Remaining amount' })
  remaining: number;
}

class DailyLimits {
  @ApiProperty({ type: LimitDetail, description: 'Daily send limit' })
  send: LimitDetail;

  @ApiProperty({ type: LimitDetail, description: 'Daily withdraw limit' })
  withdraw: LimitDetail;

  @ApiProperty({ type: LimitDetail, description: 'Daily deposit limit' })
  deposit: LimitDetail;
}

class MonthlyLimits {
  @ApiProperty({ type: LimitDetail, description: 'Total monthly limit' })
  total: LimitDetail;

  @ApiProperty({
    type: LimitDetail,
    description: 'International monthly limit',
  })
  international: LimitDetail;
}

class PerTransactionLimits {
  @ApiProperty({ example: 500, description: 'Maximum per send transaction' })
  send: number;

  @ApiProperty({
    example: 500,
    description: 'Maximum per withdraw transaction',
  })
  withdraw: number;
}

export class UserLimitsResponse {
  @ApiProperty({ enum: ['basic', 'verified', 'premium'], example: 'basic' })
  tier: UserTier;

  @ApiProperty({ enum: ['none', 'pending', 'verified'], example: 'none' })
  kycStatus: KycStatusType;

  @ApiProperty({ type: DailyLimits, description: 'Daily transaction limits' })
  daily: DailyLimits;

  @ApiProperty({
    type: MonthlyLimits,
    description: 'Monthly transaction limits',
  })
  monthly: MonthlyLimits;

  @ApiProperty({
    type: PerTransactionLimits,
    description: 'Per-transaction limits',
  })
  perTransaction: PerTransactionLimits;

  @ApiProperty({
    example: 'Complete KYC to increase limits',
    description: 'Message suggesting how to upgrade limits',
  })
  upgradeMessage: string;
}
