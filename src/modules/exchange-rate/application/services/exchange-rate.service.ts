import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  inverseRate: number;
  source: string;
  updatedAt: Date;
}

export interface ConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  fee: number;
  totalCost: number;
}

/**
 * Exchange Rate Service
 *
 * Provides CFA(XOF)/USD/USDC conversion rates.
 *
 * Rate sources (in priority order):
 * 1. Manual override via env USDC_XOF_RATE (for stability)
 * 2. External API (exchangerate-api.com free tier)
 * 3. Fallback: fixed BCEAO peg rate (1 USD = 655.957 XOF)
 *
 * USDC is pegged 1:1 to USD, so USD rate = USDC rate.
 *
 * Rates are cached in memory and refreshed every 15 minutes.
 */
@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  /** BCEAO official peg: 1 EUR = 655.957 XOF (fixed) */
  private static readonly BCEAO_EUR_XOF = 655.957;

  /** Approximate USD/XOF (derived from EUR/USD cross) */
  private static readonly DEFAULT_USD_XOF = 600;

  /** Conversion fee percentage (0 = no fee for MVP) */
  private readonly feePercent: number;

  /** Manual rate override */
  private readonly manualRate: number | null;

  /** Cached rates */
  private rates: Map<string, ExchangeRate> = new Map();

  /** External API key (optional) */
  private readonly apiKey: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const envRate = this.configService.get<string>('USDC_XOF_RATE');
    this.manualRate = envRate ? parseFloat(envRate) : null;
    this.feePercent = this.configService.get<number>('EXCHANGE_FEE_PERCENT', 0);
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY', null);
  }

  async onModuleInit() {
    await this.refreshRates();
  }

  /**
   * Get current rate for a currency pair.
   */
  getRate(from: string, to: string): ExchangeRate | null {
    const key = `${from.toUpperCase()}/${to.toUpperCase()}`;
    const rate = this.rates.get(key);
    if (rate) return rate;

    // Try inverse
    const inverseKey = `${to.toUpperCase()}/${from.toUpperCase()}`;
    const inverse = this.rates.get(inverseKey);
    if (inverse) {
      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: inverse.inverseRate,
        inverseRate: inverse.rate,
        source: inverse.source,
        updatedAt: inverse.updatedAt,
      };
    }

    return null;
  }

  /**
   * Convert amount between currencies.
   */
  convert(amount: number, from: string, to: string): ConversionResult {
    // USDC = USD (1:1 peg)
    const normalizedFrom = from.toUpperCase() === 'USDC' ? 'USD' : from.toUpperCase();
    const normalizedTo = to.toUpperCase() === 'USDC' ? 'USD' : to.toUpperCase();

    if (normalizedFrom === normalizedTo) {
      return {
        fromAmount: amount,
        fromCurrency: from.toUpperCase(),
        toAmount: amount,
        toCurrency: to.toUpperCase(),
        rate: 1,
        fee: 0,
        totalCost: amount,
      };
    }

    const rate = this.getRate(normalizedFrom, normalizedTo);
    if (!rate) {
      throw new BadRequestException(`No exchange rate available for ${from}/${to}`);
    }

    const fee = amount * (this.feePercent / 100);
    const netAmount = amount - fee;
    const convertedAmount = Math.round(netAmount * rate.rate * 100) / 100;

    return {
      fromAmount: amount,
      fromCurrency: from.toUpperCase(),
      toAmount: convertedAmount,
      toCurrency: to.toUpperCase(),
      rate: rate.rate,
      fee,
      totalCost: amount,
    };
  }

  /**
   * Get all cached rates.
   */
  getAllRates(): ExchangeRate[] {
    return Array.from(this.rates.values());
  }

  /**
   * Refresh rates from external source.
   * Runs every 15 minutes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshRates(): Promise<void> {
    const now = new Date();

    // 1. Manual override takes priority
    if (this.manualRate) {
      this.setRate('USD', 'XOF', this.manualRate, 'manual_override', now);
      this.setRate('EUR', 'XOF', ExchangeRateService.BCEAO_EUR_XOF, 'bceao_peg', now);
      this.logger.debug(`Using manual rate: 1 USD = ${this.manualRate} XOF`);
      return;
    }

    // 2. Try external API
    if (this.apiKey) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/USD`,
            { timeout: 5000 },
          ),
        );

        const data = response.data;
        if (data?.result === 'success' && data?.conversion_rates?.XOF) {
          this.setRate('USD', 'XOF', data.conversion_rates.XOF, 'exchangerate-api', now);
          if (data.conversion_rates.EUR) {
            this.setRate('EUR', 'XOF', ExchangeRateService.BCEAO_EUR_XOF, 'bceao_peg', now);
            this.setRate('USD', 'EUR', data.conversion_rates.EUR, 'exchangerate-api', now);
          }
          this.logger.log(`Rates refreshed: 1 USD = ${data.conversion_rates.XOF} XOF`);
          return;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch rates from API: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    // 3. Fallback: fixed rates
    this.setRate('USD', 'XOF', ExchangeRateService.DEFAULT_USD_XOF, 'fallback', now);
    this.setRate('EUR', 'XOF', ExchangeRateService.BCEAO_EUR_XOF, 'bceao_peg', now);
    this.logger.debug(`Using fallback rate: 1 USD = ${ExchangeRateService.DEFAULT_USD_XOF} XOF`);
  }

  private setRate(from: string, to: string, rate: number, source: string, updatedAt: Date): void {
    const key = `${from}/${to}`;
    this.rates.set(key, {
      from,
      to,
      rate,
      inverseRate: Math.round((1 / rate) * 1000000) / 1000000,
      source,
      updatedAt,
    });
  }
}
