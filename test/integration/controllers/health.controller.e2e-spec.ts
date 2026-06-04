/**
 * Health Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { ConfigService } from '@nestjs/config';

const mockHealthCheckService = {
  check: jest.fn(),
};
const mockTypeOrmHealthIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
};
const mockDependencyIndicator = {
  isHealthy: jest.fn().mockResolvedValue({ dependency: { status: 'up' } }),
};

import { HealthController } from '@modules/health/health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import {
  BlnkHealthIndicator,
  CircleHealthIndicator,
  RedisHealthIndicator,
  StellarHealthIndicator,
  TwilioHealthIndicator,
  YellowCardHealthIndicator,
} from '@modules/health/health-indicators';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  const mockConfigGet = jest.fn();

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        { provide: ConfigService, useValue: { get: mockConfigGet } },
        { provide: CircleHealthIndicator, useValue: mockDependencyIndicator },
        { provide: BlnkHealthIndicator, useValue: mockDependencyIndicator },
        { provide: RedisHealthIndicator, useValue: mockDependencyIndicator },
        {
          provide: YellowCardHealthIndicator,
          useValue: mockDependencyIndicator,
        },
        { provide: TwilioHealthIndicator, useValue: mockDependencyIndicator },
        { provide: StellarHealthIndicator, useValue: mockDependencyIndicator },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockTypeOrmHealthIndicator.pingCheck.mockResolvedValue({
      database: { status: 'up' },
    });
    mockDependencyIndicator.isHealthy.mockResolvedValue({
      dependency: { status: 'up' },
    });
    mockConfigGet.mockImplementation((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        YELLOW_CARD_ENABLED: 'false',
        'cards.issuingEnabled': false,
        'cards.issuingProvider': '',
        'bankLinking.enabled': false,
        'bankLinking.provider': '',
        'bulkPayments.enabled': false,
        'billPay.baseUrl': 'http://billpay:3400',
        nodeEnv: 'test',
        RISK_MANAGER_ENABLED: 'false',
        RISK_CLIENT_MODE: 'mock',
        KYC_PROVIDER: 'mock',
        'sms.provider': 'mock',
        'fcm.useMock': true,
      };
      return values[key] ?? defaultValue;
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status (200)', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: { database: { status: 'up' }, redis: { status: 'up' } },
      });
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });
  });

  describe('GET /api/v1/health/mobile-readiness', () => {
    it('should separate app readiness, provider readiness, and feature availability', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/mobile-readiness')
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe('ready');
          expect(body.app.ready).toBe(true);
          expect(body.app.dependencies).toMatchObject({
            database: expect.objectContaining({
              status: 'up',
              available: true,
            }),
            redis: expect.objectContaining({ status: 'up', available: true }),
            blnk: expect.objectContaining({
              status: 'up',
              available: true,
              providerMode: expect.objectContaining({
                provider: 'blnk',
                mode: 'live',
                productionLike: false,
                liveConfigured: false,
                modeStatus: 'enabled',
              }),
            }),
          });
          expect(body.providers.circle.providerMode).toMatchObject({
            provider: 'circle',
            mode: 'mock',
            productionLike: false,
            mockAllowed: true,
            liveConfigured: false,
            entityConfigured: false,
            modeStatus: 'mock',
          });
          expect(body.providers.stellar.providerMode).toMatchObject({
            provider: 'stellar',
            mode: 'live',
            productionLike: false,
            mockAllowed: true,
            liveConfigured: true,
            network: 'testnet',
            backend: 'rpc',
            modeStatus: 'ok',
          });
          expect(body.providers.yellowCard).toMatchObject({
            status: 'skipped',
            available: false,
            reason: 'YELLOW_CARD_ENABLED=false',
            providerMode: expect.objectContaining({
              provider: 'yellow_card',
              enabled: false,
              mode: 'mock',
              productionLike: false,
              mockAllowed: true,
              liveConfigured: false,
              modeStatus: 'disabled',
            }),
          });
          expect(body.providers.mobileMoneyDeposit).toMatchObject({
            mode: 'mock',
            productionLike: false,
            mockAllowed: true,
            available: true,
            status: 'mock',
          });
          expect(body.providers.mobileMoneyPayout).toMatchObject({
            mode: 'mock',
            productionLike: false,
            mockAllowed: true,
            available: true,
            status: 'mock',
          });
          expect(body.features).toMatchObject({
            deposits: {
              available: true,
              status: 'available',
              provider: 'mobile_money',
              reason: null,
            },
            externalWithdrawals: {
              available: true,
              status: 'available',
              provider: 'mobile_money',
              reason: null,
            },
            billPayments: {
              available: true,
              status: 'available',
              provider: 'bill-pay',
              reason: null,
            },
          });
          expect(body.risk).toMatchObject({
            mode: 'mock',
            configuredMode: 'mock',
            managerEnabled: false,
            productionLike: false,
            mockAllowed: true,
            fallbackAllowed: false,
            liveConfigured: false,
            status: 'disabled',
          });
          expect(body.kyc).toMatchObject({
            provider: 'mock',
            productionLike: false,
            mockAllowed: true,
            liveConfigured: false,
            status: 'mock',
          });
          expect(body.messaging).toMatchObject({
            sms: {
              provider: 'mock',
              productionLike: false,
              mockAllowed: true,
              status: 'mock',
            },
            push: {
              provider: 'mock',
              productionLike: false,
              mockAllowed: true,
              liveConfigured: false,
              status: 'mock',
            },
          });
        });
    });

    it('should expose production risk misconfiguration without leaking secrets', async () => {
      mockConfigGet.mockImplementation(
        (key: string, defaultValue?: unknown) => {
          const values: Record<string, unknown> = {
            YELLOW_CARD_ENABLED: 'false',
            'cards.issuingEnabled': false,
            'bankLinking.enabled': false,
            'bulkPayments.enabled': false,
            'billPay.baseUrl': 'http://billpay:3400',
            nodeEnv: 'production',
            RISK_MANAGER_ENABLED: 'true',
            RISK_CLIENT_MODE: 'live',
            RISK_MANAGER_URL: 'http://risk-manager:3000',
            RISK_MANAGER_API_KEY: 'dev-api-key',
            KYC_PROVIDER: 'verifyhq',
            VERIFY_HQ_API_KEY: 'your-api-key-here',
            'sms.provider': 'mock',
            'fcm.useMock': true,
          };
          return values[key] ?? defaultValue;
        },
      );

      await request(app.getHttpServer())
        .get('/api/v1/health/mobile-readiness')
        .expect(200)
        .expect(({ body }) => {
          expect(body.risk).toMatchObject({
            mode: 'live',
            managerEnabled: true,
            productionLike: true,
            mockAllowed: false,
            fallbackAllowed: false,
            liveConfigured: false,
            status: 'misconfigured',
          });
          expect(body.kyc).toMatchObject({
            provider: 'verifyhq',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: false,
            status: 'misconfigured',
          });
          expect(body.messaging).toMatchObject({
            sms: {
              provider: 'mock',
              productionLike: true,
              mockAllowed: false,
              status: 'misconfigured',
            },
            push: {
              provider: 'mock',
              productionLike: true,
              mockAllowed: false,
              liveConfigured: false,
              status: 'misconfigured',
            },
          });
          expect(body.app.dependencies.blnk.providerMode).toMatchObject({
            provider: 'blnk',
            mode: 'live',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: false,
            modeStatus: 'misconfigured',
          });
          expect(body.providers.circle.providerMode).toMatchObject({
            provider: 'circle',
            mode: 'mock',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: false,
            entityConfigured: false,
            modeStatus: 'misconfigured',
          });
          expect(body.providers.stellar.providerMode).toMatchObject({
            provider: 'stellar',
            mode: 'live',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: true,
            network: 'testnet',
            backend: 'rpc',
            modeStatus: 'review_required',
          });
          expect(body.providers.yellowCard.providerMode).toMatchObject({
            provider: 'yellow_card',
            enabled: false,
            mode: 'mock',
            productionLike: true,
            mockAllowed: false,
            liveConfigured: false,
            modeStatus: 'disabled',
          });
          expect(body.providers.mobileMoneyDeposit).toMatchObject({
            mode: 'disabled',
            productionLike: true,
            mockAllowed: false,
            available: false,
            status: 'unavailable',
            reason: 'provider_not_implemented',
            featureReason: 'deposit_provider_not_connected',
          });
          expect(body.providers.mobileMoneyPayout).toMatchObject({
            mode: 'disabled',
            productionLike: true,
            mockAllowed: false,
            available: false,
            status: 'unavailable',
            reason: 'provider_not_implemented',
            featureReason: 'payout_provider_not_connected',
          });
          expect(JSON.stringify(body)).not.toContain('dev-api-key');
          expect(JSON.stringify(body)).not.toContain('your-api-key-here');
        });
    });

    it('should return not_ready when a core app dependency is down without hiding feature state', async () => {
      mockTypeOrmHealthIndicator.pingCheck.mockRejectedValue(
        new Error(
          'database unavailable at postgres://wallet:secret@db:5432/usdc_wallet',
        ),
      );

      await request(app.getHttpServer())
        .get('/api/v1/health/mobile-readiness')
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe('not_ready');
          expect(body.app.ready).toBe(false);
          expect(body.app.dependencies.database).toMatchObject({
            status: 'down',
            available: false,
            error: 'dependency_unavailable',
            errorType: 'Error',
          });
          expect(JSON.stringify(body)).not.toContain('secret');
          expect(JSON.stringify(body)).not.toContain('usdc_wallet');
          expect(body.features.billPayments.status).toBe('available');
        });
    });

    it('should return degraded when only an external provider is down', async () => {
      mockDependencyIndicator.isHealthy.mockImplementation((name: string) => {
        if (name === 'circle') {
          return Promise.reject(
            new Error(
              'Circle failed for https://api_key:secret@circle.example/v1',
            ),
          );
        }
        return Promise.resolve({ [name]: { status: 'up' } });
      });

      await request(app.getHttpServer())
        .get('/api/v1/health/mobile-readiness')
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe('degraded');
          expect(body.app.ready).toBe(true);
          expect(body.providers.circle).toMatchObject({
            status: 'down',
            available: false,
            error: 'dependency_unavailable',
            errorType: 'Error',
          });
          expect(JSON.stringify(body)).not.toContain('api_key');
          expect(JSON.stringify(body)).not.toContain('secret');
        });
    });
  });

  describe('GET /api/v1/health/exchange-rates', () => {
    it('should classify fallback rates as non-executable indicative data', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/exchange-rates')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            baseCurrency: 'USDC',
            quoteStatus: 'indicative_fallback',
            executable: false,
            validForExecution: false,
            live: false,
            stale: true,
            provider: null,
            source: 'static_fallback',
            reason: 'exchange_rate_provider_not_connected',
          });
          expect(body.warning).toContain('Do not use this health endpoint');
          expect(body.rates.XOF).toMatchObject({
            mid: 600,
            source: 'static_fallback',
            executable: false,
          });
        });
    });
  });
});
