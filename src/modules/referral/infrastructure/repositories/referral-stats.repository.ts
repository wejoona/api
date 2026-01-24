import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralStatsOrmEntity } from '../orm-entities/referral-stats.orm-entity';

export const REFERRAL_STATS_REPOSITORY = Symbol('REFERRAL_STATS_REPOSITORY');

@Injectable()
export class ReferralStatsRepository {
  constructor(
    @InjectRepository(ReferralStatsOrmEntity)
    private readonly repository: Repository<ReferralStatsOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<ReferralStatsOrmEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findByCode(code: string): Promise<ReferralStatsOrmEntity | null> {
    return this.repository.findOne({ where: { referralCode: code } });
  }

  async create(
    stats: Partial<ReferralStatsOrmEntity>,
  ): Promise<ReferralStatsOrmEntity> {
    const entity = this.repository.create(stats);
    return this.repository.save(entity);
  }

  async update(
    userId: string,
    updates: Partial<ReferralStatsOrmEntity>,
  ): Promise<ReferralStatsOrmEntity | null> {
    await this.repository.update({ userId }, updates);
    return this.findByUserId(userId);
  }

  async incrementReferralCount(
    userId: string,
    completed: boolean,
  ): Promise<void> {
    if (completed) {
      await this.repository.increment({ userId }, 'completedReferrals', 1);
      await this.repository.decrement({ userId }, 'pendingReferrals', 1);
    } else {
      await this.repository.increment({ userId }, 'totalReferrals', 1);
      await this.repository.increment({ userId }, 'pendingReferrals', 1);
    }
  }

  async addEarnings(userId: string, amount: bigint): Promise<void> {
    const stats = await this.findByUserId(userId);
    if (stats) {
      await this.repository.update(
        { userId },
        {
          totalEarnings: BigInt(stats.totalEarnings) + amount,
        },
      );
    }
  }

  async getTopReferrers(limit: number = 10): Promise<ReferralStatsOrmEntity[]> {
    return this.repository.find({
      order: { completedReferrals: 'DESC' },
      take: limit,
    });
  }

  async updateTier(userId: string, tier: string): Promise<void> {
    await this.repository.update({ userId }, { tier });
  }
}
