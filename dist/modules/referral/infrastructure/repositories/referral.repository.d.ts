import { Repository } from 'typeorm';
import { ReferralOrmEntity, ReferralStatus } from '../orm-entities/referral.orm-entity';
export declare const REFERRAL_REPOSITORY: unique symbol;
export declare class ReferralRepository {
    private readonly repository;
    constructor(repository: Repository<ReferralOrmEntity>);
    findById(id: string): Promise<ReferralOrmEntity | null>;
    findByCode(code: string): Promise<ReferralOrmEntity | null>;
    findByReferrerId(referrerId: string): Promise<ReferralOrmEntity[]>;
    findByReferredId(referredId: string): Promise<ReferralOrmEntity | null>;
    findPendingByCode(code: string): Promise<ReferralOrmEntity | null>;
    create(referral: Partial<ReferralOrmEntity>): Promise<ReferralOrmEntity>;
    update(id: string, updates: Partial<ReferralOrmEntity>): Promise<ReferralOrmEntity | null>;
    updateStatus(id: string, status: ReferralStatus): Promise<void>;
    countByReferrerId(referrerId: string): Promise<number>;
    countCompletedByReferrerId(referrerId: string): Promise<number>;
    findUnrewardedCompleted(): Promise<ReferralOrmEntity[]>;
}
