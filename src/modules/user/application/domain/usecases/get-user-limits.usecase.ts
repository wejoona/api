import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../infrastructure/repositories';
import { WalletRepository } from '../../../../wallet/infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../../transaction/infrastructure/repositories/transaction.repository';
import {
  UserLimitsResponse,
  UserTier,
  KycStatusType,
} from '../../dto/responses/user-limits.response';

export interface GetUserLimitsInput {
  userId: string;
}

/**
 * Transaction limit tiers based on KYC status
 * These limits define the boundaries for user transactions at different verification levels
 */
interface LimitTier {
  daily: {
    send: number;
    withdraw: number;
    deposit: number;
  };
  monthly: {
    total: number;
    international: number;
  };
  perTransaction: {
    send: number;
    withdraw: number;
  };
}

/**
 * SECURITY: Define transaction limits per tier
 * These limits are enforced at the application level before transactions are processed
 */
const LIMIT_TIERS: Record<UserTier, LimitTier> = {
  basic: {
    daily: {
      send: 1000,
      withdraw: 500,
      deposit: 5000,
    },
    monthly: {
      total: 10000,
      international: 2500,
    },
    perTransaction: {
      send: 500,
      withdraw: 500,
    },
  },
  verified: {
    daily: {
      send: 5000,
      withdraw: 2500,
      deposit: 20000,
    },
    monthly: {
      total: 50000,
      international: 10000,
    },
    perTransaction: {
      send: 2500,
      withdraw: 2500,
    },
  },
  premium: {
    daily: {
      send: 25000,
      withdraw: 10000,
      deposit: 100000,
    },
    monthly: {
      total: 250000,
      international: 50000,
    },
    perTransaction: {
      send: 10000,
      withdraw: 10000,
    },
  },
};

@Injectable()
export class GetUserLimitsUseCase {
  private readonly logger = new Logger(GetUserLimitsUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: GetUserLimitsInput): Promise<UserLimitsResponse> {
    const { userId } = input;

    // 1. Get user and determine tier
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Get wallet for the user
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    // 3. Map KYC status to tier and response format
    const { tier, kycStatus } = this.mapKycStatusToTier(user.kycStatus);
    const limits = LIMIT_TIERS[tier];

    // 4. Calculate usage for today
    const todayStart = this.getStartOfDay(new Date());
    const todayUsage = await this.calculateDailyUsage(wallet.id, todayStart);

    // 5. Calculate usage for this month
    const monthStart = this.getStartOfMonth(new Date());
    const monthUsage = await this.calculateMonthlyUsage(wallet.id, monthStart);

    // 6. Build response with calculated limits
    const response: UserLimitsResponse = {
      tier,
      kycStatus,
      daily: {
        send: {
          limit: limits.daily.send,
          used: todayUsage.send,
          remaining: Math.max(0, limits.daily.send - todayUsage.send),
        },
        withdraw: {
          limit: limits.daily.withdraw,
          used: todayUsage.withdraw,
          remaining: Math.max(0, limits.daily.withdraw - todayUsage.withdraw),
        },
        deposit: {
          limit: limits.daily.deposit,
          used: todayUsage.deposit,
          remaining: Math.max(0, limits.daily.deposit - todayUsage.deposit),
        },
      },
      monthly: {
        total: {
          limit: limits.monthly.total,
          used: monthUsage.total,
          remaining: Math.max(0, limits.monthly.total - monthUsage.total),
        },
        international: {
          limit: limits.monthly.international,
          used: monthUsage.international,
          remaining: Math.max(
            0,
            limits.monthly.international - monthUsage.international,
          ),
        },
      },
      perTransaction: {
        send: limits.perTransaction.send,
        withdraw: limits.perTransaction.withdraw,
      },
      upgradeMessage: this.getUpgradeMessage(tier, kycStatus),
    };

    this.logger.log(
      `Retrieved limits for user ${userId}: tier=${tier}, kycStatus=${kycStatus}`,
    );

    return response;
  }

  /**
   * Map user's KYC status to tier and normalized KYC status
   */
  private mapKycStatusToTier(kycStatus: string): {
    tier: UserTier;
    kycStatus: KycStatusType;
  } {
    // Map KYC status: pending/submitted -> pending, approved -> verified, rejected -> none
    switch (kycStatus) {
      case 'approved':
        return { tier: 'verified', kycStatus: 'verified' };
      case 'submitted':
      case 'pending':
        return { tier: 'basic', kycStatus: 'pending' };
      case 'rejected':
      default:
        return { tier: 'basic', kycStatus: 'none' };
    }
  }

  /**
   * Calculate daily transaction usage
   */
  private async calculateDailyUsage(
    walletId: string,
    sinceDate: Date,
  ): Promise<{
    send: number;
    withdraw: number;
    deposit: number;
  }> {
    try {
      // Get all transactions since the start of today
      const transactions =
        await this.transactionRepository.findByWalletIdWithDateRange(
          walletId,
          sinceDate,
        );

      // Sum up amounts by type (only completed and pending transactions)
      const usage = {
        send: 0,
        withdraw: 0,
        deposit: 0,
      };

      for (const tx of transactions) {
        // Only count completed or pending transactions
        if (tx.status !== 'completed' && tx.status !== 'pending') {
          continue;
        }

        const amount = Math.abs(tx.amount);

        switch (tx.type) {
          case 'transfer_internal':
          case 'transfer_external':
            usage.send += amount;
            break;
          case 'withdrawal':
            usage.withdraw += amount;
            break;
          case 'deposit':
            usage.deposit += amount;
            break;
        }
      }

      return usage;
    } catch (error) {
      this.logger.error(
        `Error calculating daily usage for wallet ${walletId}`,
        error,
      );
      // Return zero usage on error to be safe
      return { send: 0, withdraw: 0, deposit: 0 };
    }
  }

  /**
   * Calculate monthly transaction usage
   */
  private async calculateMonthlyUsage(
    walletId: string,
    sinceDate: Date,
  ): Promise<{
    total: number;
    international: number;
  }> {
    try {
      // Get all transactions since the start of this month
      const transactions =
        await this.transactionRepository.findByWalletIdWithDateRange(
          walletId,
          sinceDate,
        );

      const usage = {
        total: 0,
        international: 0,
      };

      for (const tx of transactions) {
        // Only count completed or pending transactions
        if (tx.status !== 'completed' && tx.status !== 'pending') {
          continue;
        }

        const amount = Math.abs(tx.amount);

        // Add to total for all transaction types except deposits
        if (tx.type !== 'deposit') {
          usage.total += amount;

          // For international, check if it's an external transfer
          // (we consider external transfers as potentially international)
          if (tx.type === 'transfer_external') {
            usage.international += amount;
          }
        }
      }

      return usage;
    } catch (error) {
      this.logger.error(
        `Error calculating monthly usage for wallet ${walletId}`,
        error,
      );
      // Return zero usage on error to be safe
      return { total: 0, international: 0 };
    }
  }

  /**
   * Get start of day (00:00:00)
   */
  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get start of month (first day at 00:00:00)
   */
  private getStartOfMonth(date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get upgrade message based on current tier and KYC status
   */
  private getUpgradeMessage(tier: UserTier, kycStatus: KycStatusType): string {
    if (tier === 'basic' && kycStatus === 'none') {
      return 'Complete KYC verification to increase your transaction limits';
    }

    if (tier === 'basic' && kycStatus === 'pending') {
      return 'Your KYC verification is in progress. Limits will increase once approved';
    }

    if (tier === 'verified') {
      return 'Contact support to unlock premium limits for high-volume transactions';
    }

    if (tier === 'premium') {
      return 'You have the highest limits available';
    }

    return 'Complete KYC to increase limits';
  }
}
