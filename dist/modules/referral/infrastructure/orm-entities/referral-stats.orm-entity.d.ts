export declare class ReferralStatsOrmEntity {
    id: string;
    userId: string;
    referralCode: string;
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalEarnings: bigint;
    pendingEarnings: bigint;
    earningsCurrency: string;
    tier: string;
    createdAt: Date;
    updatedAt: Date;
}
