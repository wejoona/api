import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories';
import { WalletLimitsResponse } from '../dto/responses/wallet-limits.response';

export interface GetWalletLimitsInput {
  userId: string;
}

/**
 * KYC Tier configuration matching mobile mock expectations
 */
interface TierConfig {
  tier: number;
  name: string;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
  withdrawalLimit: number;
}

/**
 * Tier definitions matching the mobile app expectations
 * Tier 0 = Unverified, Tier 1 = Basic, Tier 2 = Verified, Tier 3 = Premium
 */
const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 0,
    name: 'Unverified',
    dailyLimit: 100.0,
    monthlyLimit: 500.0,
    singleTransactionLimit: 50.0,
    withdrawalLimit: 50.0,
  },
  {
    tier: 1,
    name: 'Basic',
    dailyLimit: 500.0,
    monthlyLimit: 2000.0,
    singleTransactionLimit: 500.0,
    withdrawalLimit: 500.0,
  },
  {
    tier: 2,
    name: 'Verified',
    dailyLimit: 2000.0,
    monthlyLimit: 10000.0,
    singleTransactionLimit: 2000.0,
    withdrawalLimit: 2000.0,
  },
  {
    tier: 3,
    name: 'Premium',
    dailyLimit: 10000.0,
    monthlyLimit: 50000.0,
    singleTransactionLimit: 10000.0,
    withdrawalLimit: 10000.0,
  },
];

@Injectable()
export class GetWalletLimitsUseCase {
  private readonly logger = new Logger(GetWalletLimitsUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: GetWalletLimitsInput): Promise<WalletLimitsResponse> {
    const { userId } = input;

    // 1. Get user to determine KYC tier
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Get wallet for the user
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    // 3. Map KYC status to tier
    const tier = this.mapKycStatusToTier(user.kycStatus);
    const currentTierConfig = TIER_CONFIGS[tier];
    const nextTierConfig =
      tier < TIER_CONFIGS.length - 1 ? TIER_CONFIGS[tier + 1] : null;

    // 4. Calculate usage
    const todayStart = this.getStartOfDay(new Date());
    const dailyUsed = await this.calculateDailyUsage(wallet.id, todayStart);

    const monthStart = this.getStartOfMonth(new Date());
    const monthlyUsed = await this.calculateMonthlyUsage(wallet.id, monthStart);

    // 5. Calculate time until reset
    const now = new Date();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor(
      (msUntilReset % (1000 * 60 * 60)) / (1000 * 60),
    );

    // 6. Build response
    const response: WalletLimitsResponse = {
      dailyLimit: currentTierConfig.dailyLimit,
      monthlyLimit: currentTierConfig.monthlyLimit,
      singleTransactionLimit: currentTierConfig.singleTransactionLimit,
      withdrawalLimit: currentTierConfig.withdrawalLimit,
      dailyUsed,
      monthlyUsed,
      kycTier: tier,
      tierName: currentTierConfig.name,
      nextTierName: nextTierConfig?.name || null,
      nextTierDailyLimit: nextTierConfig?.dailyLimit || null,
      nextTierMonthlyLimit: nextTierConfig?.monthlyLimit || null,
      resetTime: tomorrow.toISOString(),
      hoursUntilReset,
      minutesUntilReset,
    };

    this.logger.log(
      `Retrieved wallet limits for user ${userId}: tier=${tier}, dailyUsed=${dailyUsed}`,
    );

    return response;
  }

  /**
   * Map KYC status to numeric tier
   * none/rejected -> 0 (Unverified)
   * pending/submitted -> 1 (Basic)
   * approved -> 2 (Verified)
   * Note: Premium (tier 3) would require additional business logic
   */
  private mapKycStatusToTier(kycStatus: string): number {
    switch (kycStatus) {
      case 'approved':
        return 2; // Verified
      case 'submitted':
      case 'pending':
        return 1; // Basic
      case 'rejected':
      case 'none':
      default:
        return 0; // Unverified
    }
  }

  /**
   * Calculate daily transaction usage (total sent + withdrawn)
   */
  private async calculateDailyUsage(
    walletId: string,
    sinceDate: Date,
  ): Promise<number> {
    try {
      const transactions =
        await this.transactionRepository.findByWalletIdWithDateRange(
          walletId,
          sinceDate,
        );

      let total = 0;
      for (const tx of transactions) {
        // Only count completed and pending transactions
        if (tx.status !== 'completed' && tx.status !== 'pending') {
          continue;
        }

        // Count sends and withdrawals (not deposits)
        if (
          tx.type === 'transfer_internal' ||
          tx.type === 'transfer_external' ||
          tx.type === 'withdrawal'
        ) {
          total += Math.abs(tx.amount);
        }
      }

      return total;
    } catch (error) {
      this.logger.error(
        `Error calculating daily usage for wallet ${walletId}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Calculate monthly transaction usage (total sent + withdrawn)
   */
  private async calculateMonthlyUsage(
    walletId: string,
    sinceDate: Date,
  ): Promise<number> {
    try {
      const transactions =
        await this.transactionRepository.findByWalletIdWithDateRange(
          walletId,
          sinceDate,
        );

      let total = 0;
      for (const tx of transactions) {
        // Only count completed and pending transactions
        if (tx.status !== 'completed' && tx.status !== 'pending') {
          continue;
        }

        // Count sends and withdrawals (not deposits)
        if (
          tx.type === 'transfer_internal' ||
          tx.type === 'transfer_external' ||
          tx.type === 'withdrawal'
        ) {
          total += Math.abs(tx.amount);
        }
      }

      return total;
    } catch (error) {
      this.logger.error(
        `Error calculating monthly usage for wallet ${walletId}`,
        error,
      );
      return 0;
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
}
