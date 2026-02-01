import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CacheWarmingService } from '../cache-warming.service';
import { FeatureFlagService } from '../../../../feature-flag/application/services/feature-flag.service';
import { YellowCardRatesService } from '../../../../shared/infrastructure/yellow-card/yellow-card-rates.service';

describe('CacheWarmingService', () => {
  let service: CacheWarmingService;
  let cacheManager: any;
  let configService: any;
  let featureFlagService: any;
  let yellowCardRatesService: any;

  beforeEach(async () => {
    // Mock dependencies
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    featureFlagService = {
      refreshCache: jest.fn(),
      getAllFlags: jest.fn(),
    };

    yellowCardRatesService = {
      getRate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheWarmingService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: FeatureFlagService,
          useValue: featureFlagService,
        },
        {
          provide: YellowCardRatesService,
          useValue: yellowCardRatesService,
        },
      ],
    }).compile();

    service = module.get<CacheWarmingService>(CacheWarmingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('warmAllCaches', () => {
    it('should warm all caches successfully', async () => {
      // Mock successful responses
      yellowCardRatesService.getRate.mockResolvedValue({
        rate: 600,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });

      featureFlagService.refreshCache.mockResolvedValue(undefined);
      featureFlagService.getAllFlags.mockResolvedValue([
        {
          key: 'mobile_money_enabled',
          isEnabled: true,
          rolloutPercentage: 100,
          enabledCountries: ['CI', 'SN'],
          platforms: ['mobile'],
          minAppVersion: '1.0.0',
          startsAt: null,
          endsAt: null,
        },
      ]);

      configService.get.mockImplementation((key: string) => {
        const config = {
          'app.supportedCountries': ['CI', 'SN', 'ML'],
          'app.supportedCurrencies': ['XOF', 'USD', 'USDC'],
          'app.minDepositAmount': 100,
          'app.maxDepositAmount': 1000000,
        };
        return config[key];
      });

      cacheManager.set.mockResolvedValue(undefined);

      await service.warmAllCaches();

      // Verify cache.set was called multiple times
      expect(cacheManager.set).toHaveBeenCalled();
      expect(cacheManager.set.mock.calls.length).toBeGreaterThan(0);
    });

    it('should not warm if already warming', async () => {
      // Start warming
      const warmPromise = service.warmAllCaches();

      // Try to warm again immediately
      await service.warmAllCaches();

      await warmPromise;

      // Second call should be skipped
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      yellowCardRatesService.getRate.mockRejectedValue(
        new Error('API timeout'),
      );

      featureFlagService.refreshCache.mockResolvedValue(undefined);
      featureFlagService.getAllFlags.mockResolvedValue([]);

      configService.get.mockReturnValue([]);
      cacheManager.set.mockResolvedValue(undefined);

      // Should not throw even with failures
      await expect(service.warmAllCaches()).resolves.not.toThrow();
    });
  });

  describe('warmExchangeRates', () => {
    it('should warm exchange rates cache', async () => {
      yellowCardRatesService.getRate.mockResolvedValue({
        rate: 600,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });

      cacheManager.set.mockResolvedValue(undefined);

      await service.warmExchangeRates();

      // Should cache all 6 currency pairs
      expect(yellowCardRatesService.getRate).toHaveBeenCalledTimes(6);
      expect(cacheManager.set).toHaveBeenCalled();

      // Verify cache keys
      const cacheKeys = cacheManager.set.mock.calls.map((call) => call[0]);
      expect(cacheKeys).toContain('rate:XOF:USD');
      expect(cacheKeys).toContain('rate:USD:XOF');
      expect(cacheKeys).toContain('rate:XOF:USDC');
    });

    it('should handle rate fetch failures', async () => {
      yellowCardRatesService.getRate.mockRejectedValue(
        new Error('Rate not available'),
      );

      await expect(service.warmExchangeRates()).rejects.toThrow();
    });
  });

  describe('warmFeatureFlags', () => {
    it('should warm feature flags cache', async () => {
      const mockFlags = [
        {
          key: 'feature1',
          isEnabled: true,
          rolloutPercentage: 100,
          enabledCountries: ['CI'],
          platforms: ['mobile'],
          minAppVersion: '1.0.0',
          startsAt: null,
          endsAt: null,
        },
        {
          key: 'feature2',
          isEnabled: false,
          rolloutPercentage: 0,
          enabledCountries: [],
          platforms: ['mobile'],
          minAppVersion: '1.0.0',
          startsAt: null,
          endsAt: null,
        },
      ];

      featureFlagService.refreshCache.mockResolvedValue(undefined);
      featureFlagService.getAllFlags.mockResolvedValue(mockFlags);
      cacheManager.set.mockResolvedValue(undefined);

      await service.warmFeatureFlags();

      expect(featureFlagService.refreshCache).toHaveBeenCalled();
      expect(featureFlagService.getAllFlags).toHaveBeenCalled();

      // Should cache all flags and individual flags
      expect(cacheManager.set).toHaveBeenCalledTimes(3); // all + 2 individual
    });
  });

  describe('warmCountryConfigurations', () => {
    it('should warm country configurations', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'app.supportedCountries') {
          return ['CI', 'SN', 'ML'];
        }
        if (key === 'app.supportedCurrencies') {
          return ['XOF', 'USD'];
        }
        return null;
      });

      cacheManager.set.mockResolvedValue(undefined);

      await service.warmCountryConfigurations();

      expect(cacheManager.set).toHaveBeenCalled();

      // Should cache all countries and individual configs
      const cacheKeys = cacheManager.set.mock.calls.map((call) => call[0]);
      expect(cacheKeys).toContain('countries:all');
      expect(cacheKeys).toContain('country:CI');
      expect(cacheKeys).toContain('country:SN');
      expect(cacheKeys).toContain('country:ML');
    });
  });

  describe('warmApplicationConfig', () => {
    it('should warm application configuration', async () => {
      configService.get.mockImplementation((key: string) => {
        const config = {
          'app.minDepositAmount': 100,
          'app.maxDepositAmount': 1000000,
          'app.minTransferAmount': 50,
          'app.maxTransferAmount': 500000,
          'app.internalTransferFeePercent': 0,
          'app.externalTransferFeePercent': 1.5,
          'app.defaultCountry': 'CI',
          'app.defaultCurrency': 'XOF',
          'compliance.largeTransactionThreshold': 100000,
          'kyc.autoApprovalEnabled': true,
          'otp.expiresIn': 300,
        };
        return config[key] || null;
      });

      cacheManager.set.mockResolvedValue(undefined);

      await service.warmApplicationConfig();

      expect(cacheManager.set).toHaveBeenCalled();

      // Should cache main config and sections
      const cacheKeys = cacheManager.set.mock.calls.map((call) => call[0]);
      expect(cacheKeys).toContain('app:config');
      expect(cacheKeys).toContain('app:config:limits');
      expect(cacheKeys).toContain('app:config:fees');
      expect(cacheKeys).toContain('app:config:compliance');
      expect(cacheKeys).toContain('app:config:kyc');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      cacheManager.get.mockImplementation((key: string) => {
        if (key === 'app:config') {
          return { limits: {}, fees: {} };
        }
        if (key === 'feature_flags:all') {
          return { flags: [{}, {}, {}] };
        }
        if (key === 'countries:all') {
          return { countries: [{}, {}] };
        }
        return null;
      });

      const stats = await service.getCacheStats();

      expect(stats).toHaveProperty('exchangeRates');
      expect(stats).toHaveProperty('featureFlags');
      expect(stats).toHaveProperty('countries');
      expect(stats).toHaveProperty('appConfig');
      expect(stats.featureFlags).toBe(3);
      expect(stats.countries).toBe(2);
      expect(stats.appConfig).toBe(true);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all cache keys', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await service.clearAllCaches();

      expect(cacheManager.del).toHaveBeenCalled();
      expect(cacheManager.del.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
