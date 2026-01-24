export type ReferralStatus = 'pending' | 'completed' | 'expired' | 'rewarded';
export declare class ReferralOrmEntity {
    id: string;
    referrerId: string;
    referredId: string | null;
    referralCode: string;
    status: ReferralStatus;
    referrerReward: bigint;
    referredReward: bigint;
    rewardCurrency: string;
    rewardedAt: Date | null;
    completedAt: Date | null;
    expiresAt: Date | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
