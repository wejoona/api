import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { FeatureFlagService } from '../../../feature-flag/application/services/feature-flag.service';
import { YellowCardRatesService } from '../../../shared/infrastructure/yellow-card/yellow-card-rates.service';

/**
 * Cache Warming Service
 *
 * Responsible for pre-populating Redis cache with frequently accessed data
 * to reduce database load and improve application performance.
 *
 * Cache warming happens:
 * 1. On application startup (via OnModuleInit)
 * 2. On scheduled intervals (configurable via cron)
 * 3. On-demand via API endpoint (admin only)
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private isWarming = false;
  private _lastWarmTime: string | null = null;

  // Cache TTLs (in seconds)
  private readonly EXCHANGE_RATE_TTL = 300; // 5 minutes
  private readonly FEATURE_FLAG_TTL = 300; // 5 minutes
  private readonly COUNTRY_CONFIG_TTL = 3600; // 1 hour
  private readonly APP_CONFIG_TTL = 3600; // 1 hour

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly featureFlagService: FeatureFlagService,
    @Optional() private readonly yellowCardRatesService: YellowCardRatesService,
  ) {}

  /**
   * Warm all caches
   * Called on application startup and on-demand
   */
  async warmAllCaches(): Promise<void> {
    if (this.isWarming) {
      this.logger.warn('Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔥 Starting cache warming...');

      // Run all cache warming operations in parallel for faster startup
      const results = await Promise.allSettled([
        this.warmExchangeRates(),
        this.warmFeatureFlags(),
        this.warmCountryConfigurations(),
        this.warmApplicationConfig(),
      ]);

      // Log results
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      const duration = Date.now() - startTime;
      this._lastWarmTime = new Date().toISOString();
      this.logger.log(
        `✅ Cache warming completed in ${duration}ms (${successful} successful, ${failed} failed)`,
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operations = [
            'Exchange Rates',
            'Feature Flags',
            'Country Configs',
            'App Config',
          ];
          this.logger.error(
            `Failed to warm ${operations[index]}: ${result.reason}`,
          );
        }
      });
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Cache warming failed', errorStack);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm exchange rates cache
   * Pre-fetches commonly used currency pairs
   */
  async warmExchangeRates(): Promise<void> {
    // Yellow Card integration disabled — skip rate warming
    if (this.configService.get<string>('YELLOW_CARD_ENABLED', 'false') !== 'true') {
      this.logger.debug('Skipping exchange rate warming (Yellow Card disabled)');
      return;
    }

    const startTime = Date.now();
    this.logger.debug('Warming exchange rates cache...');

    try {
      const currencyPairs = [
        { source: 'XOF', target: 'USD' },
        { source: 'USD', target: 'XOF' },
        { source: 'XOF', target: 'USDC' },
        { source: 'USDC', target: 'XOF' },
        { source: 'USD', target: 'USDC' },
        { source: 'USDC', target: 'USD' },
      ];

      const results = await Promise.allSettled(
        currencyPairs.map(async ({ source, target }) => {
          const cacheKey = `rate:${source}:${target}`;

          try {
            // Fetch rate from Yellow Card API
            const rate = await this.yellowCardRatesService.getRate({
              sourceCurrency: source,
              targetCurrency: target,
              amount: 100, // Sample amount for rate calculation
            });

            // Store in cache with TTL
            await this.cacheManager.set(
              cacheKey,
              {
                rate: rate.rate,
                sourceCurrency: rate.sourceCurrency,
                targetCurrency: rate.targetCurrency,
                expiresAt: rate.expiresAt,
                cachedAt: new Date().toISOString(),
              },
              this.EXCHANGE_RATE_TTL * 1000,
            );

            this.logger.debug(
              `Cached exchange rate: ${source}/${target} = ${rate.rate}`,
            );
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to cache rate ${source}/${target}: ${errorMsg}`,
            );
            throw error;
          }
        }),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Exchange rates warmed: ${successful}/${currencyPairs.length} pairs in ${duration}ms`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to warm exchange rates', errorStack);
      throw error;
    }
  }

  /**
   * Warm feature flags cache
   * Pre-loads all feature flags for fast evaluation
   */
  async warmFeatureFlags(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('Warming feature flags cache...');

    try {
      // Trigger feature flag service cache refresh
      // The service already maintains its own in-memory cache
      await this.featureFlagService.refreshCache();

      // Also cache all flags in Redis for distributed access
      const flags = await this.featureFlagService.getAllFlags();
      const cacheKey = 'feature_flags:all';

      await this.cacheManager.set(
        cacheKey,
        {
          flags: flags.map((flag) => ({
            key: flag.key,
            isEnabled: flag.isEnabled,
            rolloutPercentage: flag.rolloutPercentage,
            enabledCountries: flag.enabledCountries,
            platforms: flag.platforms,
            minAppVersion: flag.minAppVersion,
            startsAt: flag.startsAt,
            endsAt: flag.endsAt,
          })),
          cachedAt: new Date().toISOString(),
        },
        this.FEATURE_FLAG_TTL * 1000,
      );

      // Cache individual flags for quick lookups
      await Promise.all(
        flags.map((flag) =>
          this.cacheManager.set(
            `feature_flag:${flag.key}`,
            flag,
            this.FEATURE_FLAG_TTL * 1000,
          ),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Feature flags warmed: ${flags.length} flags in ${duration}ms`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to warm feature flags', errorStack);
      throw error;
    }
  }

  /**
   * Warm country configurations cache
   * Pre-loads supported countries and their settings
   */
  async warmCountryConfigurations(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('Warming country configurations cache...');

    try {
      const supportedCountries =
        this.configService.get<string[]>('app.supportedCountries') || [];
      const supportedCurrencies =
        this.configService.get<string[]>('app.supportedCurrencies') || [];

      // Country metadata for West African markets
      const countryConfigs: Record<
        string,
        {
          code: string;
          name: string;
          currency: string;
          phonePrefix: string;
          mobileMoneyProviders: string[];
          kycRequired: boolean;
          maxDailyTransfer: number;
          language: string;
        }
      > = {
        CI: {
          code: 'CI',
          name: "Côte d'Ivoire",
          currency: 'XOF',
          phonePrefix: '+225',
          mobileMoneyProviders: ['Orange Money', 'MTN MoMo', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        SN: {
          code: 'SN',
          name: 'Senegal',
          currency: 'XOF',
          phonePrefix: '+221',
          mobileMoneyProviders: ['Orange Money', 'Wave', 'Free Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        ML: {
          code: 'ML',
          name: 'Mali',
          currency: 'XOF',
          phonePrefix: '+223',
          mobileMoneyProviders: ['Orange Money', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        BF: {
          code: 'BF',
          name: 'Burkina Faso',
          currency: 'XOF',
          phonePrefix: '+226',
          mobileMoneyProviders: ['Orange Money', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        BJ: {
          code: 'BJ',
          name: 'Benin',
          currency: 'XOF',
          phonePrefix: '+229',
          mobileMoneyProviders: ['MTN MoMo', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        TG: {
          code: 'TG',
          name: 'Togo',
          currency: 'XOF',
          phonePrefix: '+228',
          mobileMoneyProviders: ['Togocel', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        NE: {
          code: 'NE',
          name: 'Niger',
          currency: 'XOF',
          phonePrefix: '+227',
          mobileMoneyProviders: ['Orange Money', 'Moov Money'],
          kycRequired: true,
          maxDailyTransfer: 1000000, // XOF
          language: 'fr',
        },
        US: {
          code: 'US',
          name: 'United States',
          currency: 'USD',
          phonePrefix: '+1',
          mobileMoneyProviders: [],
          kycRequired: true,
          maxDailyTransfer: 10000, // USD
          language: 'en',
        },
      };

      // Cache all country configurations
      const cacheKey = 'countries:all';
      await this.cacheManager.set(
        cacheKey,
        {
          countries: supportedCountries
            .filter((code) => countryConfigs[code])
            .map((code) => countryConfigs[code]),
          currencies: supportedCurrencies,
          cachedAt: new Date().toISOString(),
        },
        this.COUNTRY_CONFIG_TTL * 1000,
      );

      // Cache individual country configs
      await Promise.all(
        supportedCountries
          .filter((code) => countryConfigs[code])
          .map((code) =>
            this.cacheManager.set(
              `country:${code}`,
              countryConfigs[code],
              this.COUNTRY_CONFIG_TTL * 1000,
            ),
          ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Country configs warmed: ${supportedCountries.length} countries in ${duration}ms`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to warm country configurations', errorStack);
      throw error;
    }
  }

  /**
   * Warm application configuration cache
   * Pre-loads app settings, limits, and thresholds
   */
  async warmApplicationConfig(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('Warming application configuration cache...');

    try {
      const appConfig = {
        // Transfer limits
        limits: {
          minDepositAmount: this.configService.get<number>(
            'app.minDepositAmount',
          ),
          maxDepositAmount: this.configService.get<number>(
            'app.maxDepositAmount',
          ),
          minTransferAmount: this.configService.get<number>(
            'app.minTransferAmount',
          ),
          maxTransferAmount: this.configService.get<number>(
            'app.maxTransferAmount',
          ),
        },

        // Fees
        fees: {
          internalTransferFeePercent: this.configService.get<number>(
            'app.internalTransferFeePercent',
          ),
          externalTransferFeePercent: this.configService.get<number>(
            'app.externalTransferFeePercent',
          ),
        },

        // Default settings
        defaults: {
          country: this.configService.get<string>('app.defaultCountry'),
          currency: this.configService.get<string>('app.defaultCurrency'),
        },

        // Compliance thresholds
        compliance: {
          largeTransactionThreshold: this.configService.get<number>(
            'compliance.largeTransactionThreshold',
          ),
          velocityThreshold: this.configService.get<number>(
            'compliance.autoFlagVelocityThreshold',
          ),
          structuringTimeWindow: this.configService.get<number>(
            'compliance.structuringTimeWindow',
          ),
        },

        // KYC settings
        kyc: {
          autoApprovalEnabled: this.configService.get<boolean>(
            'kyc.autoApprovalEnabled',
          ),
          autoApprovalThreshold: this.configService.get<number>(
            'kyc.autoApprovalThreshold',
          ),
          autoRejectThreshold: this.configService.get<number>(
            'kyc.autoRejectThreshold',
          ),
        },

        // OTP settings
        otp: {
          expiresIn: this.configService.get<number>('otp.expiresIn'),
          maxAttempts: this.configService.get<number>('otp.maxAttempts'),
          useDevOtp: this.configService.get<boolean>('otp.useDevOtp'),
        },

        cachedAt: new Date().toISOString(),
      };

      // Cache entire app config
      await this.cacheManager.set(
        'app:config',
        appConfig,
        this.APP_CONFIG_TTL * 1000,
      );

      // Cache individual config sections for granular access
      await Promise.all([
        this.cacheManager.set(
          'app:config:limits',
          appConfig.limits,
          this.APP_CONFIG_TTL * 1000,
        ),
        this.cacheManager.set(
          'app:config:fees',
          appConfig.fees,
          this.APP_CONFIG_TTL * 1000,
        ),
        this.cacheManager.set(
          'app:config:compliance',
          appConfig.compliance,
          this.APP_CONFIG_TTL * 1000,
        ),
        this.cacheManager.set(
          'app:config:kyc',
          appConfig.kyc,
          this.APP_CONFIG_TTL * 1000,
        ),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`App config warmed in ${duration}ms`);
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to warm application config', errorStack);
      throw error;
    }
  }

  /**
   * Scheduled cache warming
   * Refreshes cache every 5 minutes to keep data fresh
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledCacheWarming(): Promise<void> {
    this.logger.debug('Running scheduled cache warming...');
    await this.warmAllCaches();
  }

  /**
   * Get cache statistics
   * Returns information about cached items
   */
  async getCacheStats(): Promise<{
    exchangeRates: number;
    featureFlags: number;
    countries: number;
    appConfig: boolean;
    totalKeys: number;
  }> {
    try {
      // Note: cache-manager-redis-yet doesn't expose all Redis commands
      // For production, consider using ioredis directly for advanced stats
      const stats = {
        exchangeRates: 0,
        featureFlags: 0,
        countries: 0,
        appConfig: false,
        totalKeys: 0,
      };

      // Check if key exists (simplified approach)
      const [appConfig, allFlags, allCountries] = await Promise.all([
        this.cacheManager.get('app:config'),
        this.cacheManager.get('feature_flags:all'),
        this.cacheManager.get('countries:all'),
      ]);

      if (appConfig) stats.appConfig = true;
      if (allFlags) {
        stats.featureFlags = (allFlags as any).flags?.length || 0;
      }
      if (allCountries) {
        stats.countries = (allCountries as any).countries?.length || 0;
      }

      // Count exchange rate pairs (estimated)
      stats.exchangeRates = 6; // We cache 6 currency pairs

      return stats;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to get cache stats', errorStack);
      throw error;
    }
  }

  /**
   * Clear all warmed caches
   * Use with caution - for maintenance/testing only
   */
  async clearAllCaches(): Promise<void> {
    this.logger.warn('Clearing all warmed caches...');

    try {
      // Note: For production, consider using Redis SCAN to find and delete keys
      // This is a simplified approach that clears known cache keys
      const keysToDelete = [
        'app:config',
        'app:config:limits',
        'app:config:fees',
        'app:config:compliance',
        'app:config:kyc',
        'feature_flags:all',
        'countries:all',
      ];

      // Add currency pair keys
      const currencyPairs = [
        'XOF:USD',
        'USD:XOF',
        'XOF:USDC',
        'USDC:XOF',
        'USD:USDC',
        'USDC:USD',
      ];
      currencyPairs.forEach((pair) => {
        keysToDelete.push(`rate:${pair}`);
      });

      // Delete all keys
      await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));

      this.logger.log(`Cleared ${keysToDelete.length} cache keys`);
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to clear caches', errorStack);
      throw error;
    }
  }
}
