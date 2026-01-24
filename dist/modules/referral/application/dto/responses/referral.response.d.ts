export declare class ReferralResponse {
    id: string;
    referrerId: string;
    referredId: string | null;
    referralCode: string;
    status: string;
    referrerReward: string;
    referredReward: string;
    rewardCurrency: string;
    completedAt: Date | null;
    rewardedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
}
export declare class ReferralStatsResponse {
    referralCode: string;
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalEarnings: string;
    pendingEarnings: string;
    earningsCurrency: string;
    tier: string;
    referralLink: string;
}
export declare class LeaderboardEntryResponse {
    rank: number;
    userId: string;
    completedReferrals: number;
    tier: string;
}
export declare class LeaderboardResponse {
    entries: LeaderboardEntryResponse[];
}
