import { ApiProperty } from '@nestjs/swagger';

export class ReferralResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referrerId: string;

  @ApiProperty()
  referredId: string | null;

  @ApiProperty()
  referralCode: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  referrerReward: string;

  @ApiProperty()
  referredReward: string;

  @ApiProperty()
  rewardCurrency: string;

  @ApiProperty()
  completedAt: Date | null;

  @ApiProperty()
  rewardedAt: Date | null;

  @ApiProperty()
  expiresAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class ReferralStatsResponse {
  @ApiProperty()
  referralCode: string;

  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  completedReferrals: number;

  @ApiProperty()
  pendingReferrals: number;

  @ApiProperty()
  totalEarnings: string;

  @ApiProperty()
  pendingEarnings: string;

  @ApiProperty()
  earningsCurrency: string;

  @ApiProperty()
  tier: string;

  @ApiProperty({ description: 'Shareable referral link' })
  referralLink: string;
}

export class ReferralInfoResponse {
  @ApiProperty()
  referralCode: string;

  @ApiProperty()
  referralLink: string;

  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  successfulReferrals: number;

  @ApiProperty()
  totalEarned: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: [ReferralResponse] })
  referrals: ReferralResponse[];
}

export class LeaderboardEntryResponse {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  completedReferrals: number;

  @ApiProperty()
  tier: string;
}

export class LeaderboardResponse {
  @ApiProperty({ type: [LeaderboardEntryResponse] })
  entries: LeaderboardEntryResponse[];
}
