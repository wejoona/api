import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';
import { Balance } from '../../../shared/domain/gateways';
import { formatDecimalAmount } from '../../../../common/utils/money-response.util';

export interface GetBalanceInput {
  userId: string;
}

export interface GetBalanceOutput {
  walletId: string;
  currency: string;
  source: 'ledger' | 'local_mirror';
  balances: Array<
    Balance & {
      availableDecimal: string;
      pendingDecimal: string;
      totalDecimal: string;
    }
  >;
}

/**
 * Get Balance Use Case
 *
 * Reads balance from Blnk ledger (source of truth).
 * Falls back to local wallet.balance if Blnk is unavailable.
 * No longer calls Circle/payment gateway for balance.
 */
@Injectable()
export class GetBalanceUseCase {
  private readonly logger = new Logger(GetBalanceUseCase.name);
  private readonly CACHE_TTL = 30; // 30 seconds

  constructor(
    private readonly walletRepository: WalletRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(input: GetBalanceInput): Promise<GetBalanceOutput> {
    const cacheKey = `balance:${input.userId}`;

    // Try to get from cache first
    const cachedBalance =
      await this.cacheManager.get<GetBalanceOutput>(cacheKey);
    if (cachedBalance) {
      return cachedBalance;
    }

    // Cache miss - fetch from source
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Primary: Read balance from Blnk ledger (source of truth)
    try {
      const blnkBalance = await this.ledgerProvider.getUserBalance(
        input.userId,
        'USDC',
      );

      if (blnkBalance) {
        // Convert from micro-USDC (bigint) to human-readable
        const available =
          Number(blnkBalance.availableBalance) / 1_000_000;
        const total = Number(blnkBalance.balance) / 1_000_000;
        const pending =
          Number(blnkBalance.inflightBalance) / 1_000_000;

        const result: GetBalanceOutput = {
          walletId: wallet.id,
          currency: wallet.currency,
          source: 'ledger',
          balances: [
            this.withBalanceDecimals('USDC', available, pending, total),
          ],
        };

        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to read balance from Blnk for user ${input.userId}: ${error instanceof Error ? error.message : 'Unknown'}. Falling back to local balance.`,
      );
    }

    // Fallback: Use local wallet.balance from database
    const result: GetBalanceOutput = {
      walletId: wallet.id,
      currency: wallet.currency,
      source: 'local_mirror',
      balances: [
        this.withBalanceDecimals(
          wallet.currency,
          wallet.balance,
          0,
          wallet.balance,
        ),
      ],
    };

    // Cache for shorter time since it's fallback balance
    await this.cacheManager.set(cacheKey, result, 10);
    return result;
  }

  private withBalanceDecimals(
    currency: string,
    available: number,
    pending: number,
    total: number,
  ): Balance & {
    availableDecimal: string;
    pendingDecimal: string;
    totalDecimal: string;
  } {
    return {
      currency,
      available,
      pending,
      total,
      availableDecimal: formatDecimalAmount(available, currency),
      pendingDecimal: formatDecimalAmount(pending, currency),
      totalDecimal: formatDecimalAmount(total, currency),
    };
  }
}
