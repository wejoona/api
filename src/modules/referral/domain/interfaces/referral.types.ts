/**
 * Referral Types
 * Shared types for referral and rewards system
 */

// Referral status
export type ReferralStatus =
  | 'pending' // Referee signed up but hasn't completed requirements
  | 'qualified' // Referee completed requirements, reward pending
  | 'rewarded' // Reward credited to referrer
  | 'expired' // Referral expired without completion
  | 'rejected'; // Referral rejected (fraud, etc.)

// Reward status
export type RewardStatus =
  | 'pending' // Reward earned but not yet credited
  | 'credited' // Reward credited to wallet
  | 'claimed' // User claimed/withdrew the reward
  | 'expired' // Reward expired
  | 'cancelled'; // Reward cancelled

// Reward type
export type RewardType =
  | 'signup_bonus' // Bonus for signing up
  | 'referral_bonus' // Bonus for successful referral
  | 'first_tx_bonus' // Bonus for first transaction
  | 'campaign_bonus' // Campaign-specific bonus
  | 'milestone_bonus'; // Milestone achievement bonus

// Referral code
export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  usageCount: number;
  maxUsages?: number;
  expiresAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Referral relationship
export interface Referral {
  id: string;
  referrerId: string; // User who referred
  refereeId: string; // User who was referred
  referralCodeId: string;
  status: ReferralStatus;
  qualificationRequirements: {
    kycCompleted: boolean;
    firstTransactionCompleted: boolean;
    minimumTransactionAmount?: number;
  };
  qualifiedAt?: Date;
  rewardedAt?: Date;
  referrerRewardId?: string;
  refereeRewardId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Reward
export interface Reward {
  id: string;
  userId: string;
  type: RewardType;
  status: RewardStatus;
  amount: number;
  currency: string;
  referralId?: string;
  campaignId?: string;
  creditedAt?: Date;
  claimedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Campaign
export interface Campaign {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'referral_boost' | 'signup_bonus' | 'transaction_bonus' | 'milestone';
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  rewards: {
    referrerAmount: number;
    refereeAmount: number;
    bonusAmount?: number;
    currency: string;
  };
  requirements: {
    kycRequired: boolean;
    minimumTransactionAmount?: number;
    minimumTransactionCount?: number;
  };
  limits: {
    maxParticipants?: number;
    maxRewardsPerUser?: number;
    totalBudget?: number;
  };
  currentStats: {
    participants: number;
    rewardsDistributed: number;
    totalSpent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Referral stats
export interface ReferralStats {
  userId: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  currentTier: ReferralTier;
  nextTierProgress: number;
}

// Referral tiers
export type ReferralTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierConfig {
  tier: ReferralTier;
  minReferrals: number;
  rewardMultiplier: number;
  perks: string[];
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'bronze',
    minReferrals: 0,
    rewardMultiplier: 1.0,
    perks: ['Standard referral rewards'],
  },
  {
    tier: 'silver',
    minReferrals: 5,
    rewardMultiplier: 1.25,
    perks: ['25% bonus on referral rewards', 'Priority support'],
  },
  {
    tier: 'gold',
    minReferrals: 15,
    rewardMultiplier: 1.5,
    perks: [
      '50% bonus on referral rewards',
      'Priority support',
      'Early access to features',
    ],
  },
  {
    tier: 'platinum',
    minReferrals: 50,
    rewardMultiplier: 2.0,
    perks: [
      '100% bonus on referral rewards',
      'VIP support',
      'Early access',
      'Exclusive campaigns',
    ],
  },
];

// Events
export interface ReferralCreatedEvent {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
}

export interface ReferralQualifiedEvent {
  referralId: string;
  referrerId: string;
  refereeId: string;
  qualificationReason:
    | 'kyc_completed'
    | 'first_transaction'
    | 'campaign_completed';
}

export interface RewardCreditedEvent {
  rewardId: string;
  userId: string;
  amount: number;
  currency: string;
  type: RewardType;
}
