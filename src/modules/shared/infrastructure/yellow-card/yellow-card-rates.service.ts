import { Injectable, Logger } from '@nestjs/common';
import { YellowCardAuthService } from './yellow-card-auth.service';
import { RateRequest, RateResponse } from './yellow-card.types';

/**
 * Yellow Card Rates Service
 * Handles exchange rate queries and conversions
 */
@Injectable()
export class YellowCardRatesService {
  private readonly logger = new Logger(YellowCardRatesService.name);

  constructor(private readonly authService: YellowCardAuthService) {}

  /**
   * Get exchange rate
   */
  async getRate(request: RateRequest): Promise<RateResponse> {
    if (this.authService.isMockMode()) {
      return this.mockGetRate(request);
    }
    return this.apiGetRate(request);
  }

  // ============================================
  // MOCK IMPLEMENTATION
  // ============================================

  private mockGetRate(request: RateRequest): RateResponse {
    let rate = 1;
    if (request.sourceCurrency === 'XOF' && request.targetCurrency === 'USD') {
      rate = 0.00166;
    } else if (
      request.sourceCurrency === 'USD' &&
      request.targetCurrency === 'XOF'
    ) {
      rate = 602.41;
    }

    return {
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate,
      sourceAmount: request.amount,
      targetAmount: request.amount * rate,
      fee: request.amount * 0.015,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  // ============================================
  // REAL API IMPLEMENTATION
  // ============================================

  private async apiGetRate(request: RateRequest): Promise<RateResponse> {
    this.logger.debug(
      `Getting rate: ${request.amount} ${request.sourceCurrency} to ${request.targetCurrency}`,
    );

    interface YCRate {
      source: string;
      destination: string;
      buy: number;
      sell: number;
      expiresAt: string;
    }

    const response = await this.authService.makeRequest<{ data: YCRate }>(
      'GET',
      `/business/rates?source=${request.sourceCurrency}&destination=${request.targetCurrency}`,
    );

    const rate = response.data;
    const conversionRate =
      request.sourceCurrency === 'USD' ? rate.sell : rate.buy;
    const fee = request.amount * 0.015; // 1.5% fee
    const targetAmount = (request.amount - fee) * conversionRate;

    return {
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate: conversionRate,
      sourceAmount: request.amount,
      targetAmount,
      fee,
      expiresAt: rate.expiresAt,
    };
  }
}
