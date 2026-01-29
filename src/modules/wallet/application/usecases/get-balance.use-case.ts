import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  Balance,
} from '../../../shared/domain/gateways';

export interface GetBalanceInput {
  userId: string;
}

export interface GetBalanceOutput {
  walletId: string;
  currency: string;
  balances: Balance[];
}

@Injectable()
export class GetBalanceUseCase {
  private readonly CACHE_TTL = 30; // 30 seconds

  constructor(
    private readonly walletRepository: WalletRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
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

    // Check for provider wallet ID (Circle or Yellow Card)
    const providerWalletId = wallet.circleWalletId || wallet.yellowCardWalletId;

    // If no provider linked, return local balance from database
    if (!providerWalletId) {
      const result: GetBalanceOutput = {
        walletId: wallet.id,
        currency: wallet.currency,
        balances: [
          {
            currency: 'USD',
            available: wallet.balance,
            pending: 0,
            total: wallet.balance,
          },
          {
            currency: 'USDC',
            available: 0,
            pending: 0,
            total: 0,
          },
        ],
      };

      // Cache for shorter time since it's local balance
      await this.cacheManager.set(cacheKey, result, 10);
      return result;
    }

    // Fetch from payment gateway
    const balanceResponse =
      await this.paymentGateway.getBalance(providerWalletId);

    const result: GetBalanceOutput = {
      walletId: wallet.id,
      currency: wallet.currency,
      balances: balanceResponse.balances,
    };

    // Cache the result for 30 seconds
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}
