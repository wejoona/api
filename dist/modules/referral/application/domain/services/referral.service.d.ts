import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReferralRepository } from '../../../infrastructure/repositories/referral.repository';
import { ReferralStatsRepository } from '../../../infrastructure/repositories/referral-stats.repository';
import { ReferralOrmEntity } from '../../../infrastructure/orm-entities/referral.orm-entity';
import { ReferralStatsOrmEntity } from '../../../infrastructure/orm-entities/referral-stats.orm-entity';
export interface ReferralConfig {
    referrerReward: bigint;
    referredReward: bigint;
    expirationDays: number;
    minTransactionForCompletion: bigint;
}
export declare class ReferralService {
    private readonly referralRepository;
    private readonly statsRepository;
    private readonly eventEmitter;
    private readonly logger;
    private readonly config;
    constructor(referralRepository: ReferralRepository, statsRepository: ReferralStatsRepository, eventEmitter: EventEmitter2);
    generateReferralCode(userId: string): Promise<string>;
    getUserReferralCode(userId: string): Promise<string>;
    applyReferralCode(referredUserId: string, code: string): Promise<ReferralOrmEntity>;
    completeReferral(referredUserId: string): Promise<void>;
    processRewards(referralId: string): Promise<void>;
    getUserStats(userId: string): Promise<ReferralStatsOrmEntity | null>;
    getUserReferrals(userId: string): Promise<ReferralOrmEntity[]>;
    getLeaderboard(limit?: number): Promise<ReferralStatsOrmEntity[]>;
    updateUserTier(userId: string): Promise<string>;
    private createUniqueCode;
}
