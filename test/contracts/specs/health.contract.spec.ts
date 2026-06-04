/**
 * Health/readiness contract tests.
 */

import {
  DependencyReadinessSchema,
  FeatureReadinessSchema,
  MobileReadinessSchema,
  MockBackedProviderStatusSchema,
  ProviderModeSchema,
} from '../schemas/health.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Health Contracts', () => {
  describe('GET /health/mobile-readiness', () => {
    const providerMode = {
      provider: 'circle',
      mode: 'live',
      productionLike: true,
      mockAllowed: false,
      liveConfigured: true,
      entityConfigured: true,
      modeStatus: 'enabled',
    };

    it('should validate provider mode metadata required by mobile/dashboard clients', () => {
      const result = validateSchema(providerMode, ProviderModeSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate dependency readiness with sanitized provider mode metadata', () => {
      const dependency = {
        name: 'blnk',
        status: 'up',
        available: true,
        details: {
          status: 'up',
          latency: '12ms',
        },
        providerMode: {
          provider: 'blnk',
          mode: 'live',
          productionLike: true,
          mockAllowed: false,
          liveConfigured: true,
          modeStatus: 'enabled',
        },
      };

      const result = validateSchema(dependency, DependencyReadinessSchema);
      expect(result.valid).toBe(true);
      expect(JSON.stringify(dependency)).not.toMatch(
        /url|apiKey|token|secret|password|ledgerId/i,
      );
    });

    it('should validate mock-backed mobile money provider state', () => {
      const status = {
        mode: 'disabled',
        productionLike: true,
        mockAllowed: false,
        liveConfigured: false,
        available: false,
        status: 'unavailable',
        reason: 'provider_not_implemented',
        featureReason: 'deposit_provider_not_connected',
      };

      const result = validateSchema(status, MockBackedProviderStatusSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate feature readiness metadata', () => {
      const feature = {
        available: false,
        status: 'unavailable',
        provider: 'mobile_money',
        reason: 'provider_not_implemented',
      };

      const result = validateSchema(feature, FeatureReadinessSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate top-level mobile readiness response shape', () => {
      const response = {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        app: {
          ready: true,
          dependencies: {
            database: { name: 'database', status: 'up', available: true },
            redis: { name: 'redis', status: 'up', available: true },
            blnk: {
              name: 'blnk',
              status: 'up',
              available: true,
              providerMode: {
                provider: 'blnk',
                mode: 'live',
                productionLike: true,
                mockAllowed: false,
                liveConfigured: true,
                modeStatus: 'enabled',
              },
            },
          },
        },
        providers: {
          circle: {
            name: 'circle',
            status: 'up',
            available: true,
            providerMode,
          },
          stellar: {
            name: 'stellar',
            status: 'up',
            available: true,
            providerMode: {
              provider: 'stellar',
              mode: 'live',
              productionLike: true,
              mockAllowed: false,
              liveConfigured: true,
              network: 'mainnet',
              backend: 'rpc',
              modeStatus: 'ok',
            },
          },
          yellowCard: {
            name: 'yellowCard',
            status: 'skipped',
            available: false,
            reason: 'YELLOW_CARD_ENABLED=false',
            providerMode: {
              provider: 'yellow_card',
              enabled: false,
              mode: 'live',
              productionLike: true,
              mockAllowed: false,
              liveConfigured: false,
              modeStatus: 'disabled',
            },
          },
          mobileMoneyDeposit: {
            mode: 'disabled',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: false,
            available: false,
            status: 'unavailable',
            reason: 'provider_not_implemented',
            featureReason: 'deposit_provider_not_connected',
          },
        },
        features: {
          deposits: {
            available: false,
            status: 'unavailable',
            provider: 'mobile_money',
            reason: 'provider_not_implemented',
          },
        },
        risk: { mode: 'live', status: 'enabled' },
        kyc: { provider: 'verifyhq', status: 'enabled' },
        messaging: { sms: { provider: 'twilio' }, push: { provider: 'fcm' } },
      };

      const result = validateSchema(response, MobileReadinessSchema);
      expect(result.valid).toBe(true);
      expect(JSON.stringify(response)).not.toMatch(
        /http:\/\/|https:\/\/|apiKey|token|secret|password|databaseName|ledgerId/i,
      );
    });
  });
});
