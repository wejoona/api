import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

const DEFAULT_CONFIG: ReferralConfig = {
  referrerReward: BigInt(1000000), // 1 USDC
  referredReward: BigInt(500000), // 0.5 USDC
  expirationDays: 30,
  minTransactionForCompletion: BigInt(5000000), // 5 USDC
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly config: ReferralConfig = DEFAULT_CONFIG;

  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly statsRepository: ReferralStatsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a referral code
    const existingStats = await this.statsRepository.findByUserId(userId);
    if (existingStats) {
      return existingStats.referralCode;
    }

    // Generate unique code
    const code = this.createUniqueCode();

    // Create stats record
    await this.statsRepository.create({
      userId,
      referralCode: code,
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalEarnings: BigInt(0),
      pendingEarnings: BigInt(0),
      tier: 'bronze',
    });

    this.logger.log(`Generated referral code ${code} for user ${userId}`);
    return code;
  }

  /**
   * Get user's referral code (or generate if doesn't exist)
   */
  async getUserReferralCode(userId: string): Promise<string> {
    const stats = await this.statsRepository.findByUserId(userId);
    if (stats) {
      return stats.referralCode;
    }
    return this.generateReferralCode(userId);
  }

  /**
   * Apply a referral code when a new user signs up
   */
  async applyReferralCode(
    referredUserId: string,
    code: string,
  ): Promise<ReferralOrmEntity> {
    // Find the referrer by code
    const stats = await this.statsRepository.findByCode(code);
    if (!stats) {
      throw new NotFoundException('Invalid referral code');
    }

    // Check if user was already referred
    const existingReferral =
      await this.referralRepository.findByReferredId(referredUserId);
    if (existingReferral) {
      throw new BadRequestException('User has already been referred');
    }

    // Prevent self-referral
    if (stats.userId === referredUserId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.expirationDays);

    // Create referral record
    const referral = await this.referralRepository.create({
      referrerId: stats.userId,
      referredId: referredUserId,
      referralCode: code,
      status: 'pending',
      referrerReward: this.config.referrerReward,
      referredReward: this.config.referredReward,
      rewardCurrency: 'USDC',
      expiresAt,
    });

    // Update stats
    await this.statsRepository.incrementReferralCount(stats.userId, false);

    this.logger.log(
      `Applied referral code ${code}: ${stats.userId} referred ${referredUserId}`,
    );

    this.eventEmitter.emit('referral.applied', {
      referralId: referral.id,
      referrerId: stats.userId,
      referredId: referredUserId,
      code,
    });

    return referral;
  }

  /**
   * Complete a referral when referred user makes qualifying transaction
   */
  async completeReferral(referredUserId: string): Promise<void> {
    const referral =
      await this.referralRepository.findByReferredId(referredUserId);
    if (!referral || referral.status !== 'pending') {
      return; // No pending referral
    }

    // Check if expired
    if (referral.expiresAt && new Date() > referral.expiresAt) {
      await this.referralRepository.updateStatus(referral.id, 'expired');
      return;
    }

    // Mark as completed
    await this.referralRepository.updateStatus(referral.id, 'completed');
    await this.statsRepository.incrementReferralCount(
      referral.referrerId,
      true,
    );

    this.logger.log(
      `Completed referral ${referral.id} for user ${referredUserId}`,
    );

    this.eventEmitter.emit('referral.completed', {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredId: referredUserId,
    });
  }

  /**
   * Process rewards for completed referrals
   */
  async processRewards(referralId: string): Promise<void> {
    const referral = await this.referralRepository.findById(referralId);
    if (!referral || referral.status !== 'completed') {
      return;
    }

    // Mark as rewarded
    await this.referralRepository.updateStatus(referral.id, 'rewarded');

    // Add earnings to referrer
    await this.statsRepository.addEarnings(
      referral.referrerId,
      BigInt(referral.referrerReward),
    );

    this.logger.log(
      `Processed rewards for referral ${referralId}: referrer gets ${referral.referrerReward}`,
    );

    this.eventEmitter.emit('referral.rewarded', {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredId: referral.referredId,
      referrerReward: referral.referrerReward.toString(),
      referredReward: referral.referredReward.toString(),
    });
  }

  /**
   * Get user's referral statistics
   */
  async getUserStats(userId: string): Promise<ReferralStatsOrmEntity | null> {
    return this.statsRepository.findByUserId(userId);
  }

  /**
   * Get user's referral history
   */
  async getUserReferrals(userId: string): Promise<ReferralOrmEntity[]> {
    return this.referralRepository.findByReferrerId(userId);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<ReferralStatsOrmEntity[]> {
    return this.statsRepository.getTopReferrers(limit);
  }

  /**
   * Update user tier based on completed referrals
   */
  async updateUserTier(userId: string): Promise<string> {
    const stats = await this.statsRepository.findByUserId(userId);
    if (!stats) {
      return 'bronze';
    }

    let tier = 'bronze';
    if (stats.completedReferrals >= 50) {
      tier = 'diamond';
    } else if (stats.completedReferrals >= 25) {
      tier = 'platinum';
    } else if (stats.completedReferrals >= 10) {
      tier = 'gold';
    } else if (stats.completedReferrals >= 5) {
      tier = 'silver';
    }

    if (tier !== stats.tier) {
      await this.statsRepository.updateTier(userId, tier);
      this.eventEmitter.emit('referral.tier.upgraded', {
        userId,
        oldTier: stats.tier,
        newTier: tier,
      });
    }

    return tier;
  }

  /**
   * Create a unique referral code
   */
  private createUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
