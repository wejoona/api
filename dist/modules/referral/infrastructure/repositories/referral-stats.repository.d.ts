import { Repository } from 'typeorm';
import { ReferralStatsOrmEntity } from '../orm-entities/referral-stats.orm-entity';
export declare const REFERRAL_STATS_REPOSITORY: unique symbol;
export declare class ReferralStatsRepository {
    private readonly repository;
    constructor(repository: Repository<ReferralStatsOrmEntity>);
    findByUserId(userId: string): Promise<ReferralStatsOrmEntity | null>;
    findByCode(code: string): Promise<ReferralStatsOrmEntity | null>;
    create(stats: Partial<ReferralStatsOrmEntity>): Promise<ReferralStatsOrmEntity>;
    update(userId: string, updates: Partial<ReferralStatsOrmEntity>): Promise<ReferralStatsOrmEntity | null>;
    incrementReferralCount(userId: string, completed: boolean): Promise<void>;
    addEarnings(userId: string, amount: bigint): Promise<void>;
    getTopReferrers(limit?: number): Promise<ReferralStatsOrmEntity[]>;
    updateTier(userId: string, tier: string): Promise<void>;
}
