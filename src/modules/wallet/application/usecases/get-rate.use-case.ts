import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  RateResponse,
} from '../../../shared/domain/gateways';

export interface GetRateInput {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
  direction?: 'buy' | 'sell';
}

@Injectable()
export class GetRateUseCase {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(input: GetRateInput): Promise<RateResponse> {
    const cacheKey = `rate:${input.sourceCurrency}:${input.targetCurrency}`;

    // Try to get from cache first
    const cachedRate = await this.cacheManager.get<RateResponse>(cacheKey);
    if (cachedRate) {
      return cachedRate;
    }

    // Cache miss - fetch from payment gateway
    const rateResponse = await this.paymentGateway.getRate({
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      amount: input.amount,
      direction: input.direction || 'buy',
    });

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, rateResponse, this.CACHE_TTL);

    return rateResponse;
  }
}
