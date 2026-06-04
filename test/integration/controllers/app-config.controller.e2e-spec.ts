/**
 * App Config Controller Integration Tests
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { AppConfigController } from '@modules/app-config/app-config.controller';
import { ConfigService } from '@nestjs/config';

describe('AppConfigController (e2e)', () => {
  let app: INestApplication;
  const mockConfigGet = jest.fn();

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AppConfigController],
      providers: [{ provide: ConfigService, useValue: { get: mockConfigGet } }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    mockConfigGet.mockReset();
    mockConfigGet.mockReturnValue(undefined);
  });

  describe('GET /api/v1/config/countries', () => {
    it('should return region-aware country config for Côte d’Ivoire and United States', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/config/countries')
        .expect(200)
        .expect(({ body }) => {
          const ci = body.find((country: any) => country.code === 'CI');
          const us = body.find((country: any) => country.code === 'US');

          expect(ci).toMatchObject({
            dialCode: '+225',
            currency: 'XOF',
            defaultLocale: 'fr-CI',
            region: 'west_africa',
            market: 'active',
            paymentRails: ['mobile_money', 'usdc'],
            mobileMoneyProviders: ['orange_money', 'mtn_momo', 'wave'],
            availability: {
              onboarding: 'open',
              deposits: 'available',
              withdrawals: 'available',
              bankLinking: 'disabled',
              cards: 'waitlist',
              billPayments: 'waitlist',
            },
            features: {
              usdcWallet: true,
              internalTransfers: true,
              contactDiscovery: true,
              mobileMoney: true,
              bankRails: false,
              virtualCards: false,
              billPayments: false,
            },
          });
          expect(us).toMatchObject({
            dialCode: '+1',
            currency: 'USD',
            defaultLocale: 'en-US',
            region: 'north_america',
            market: 'active',
            paymentRails: ['usdc'],
            mobileMoneyProviders: [],
            availability: {
              onboarding: 'open',
              deposits: 'available',
              withdrawals: 'available',
              bankLinking: 'waitlist',
              cards: 'waitlist',
              billPayments: 'disabled',
            },
            features: {
              usdcWallet: true,
              internalTransfers: true,
              contactDiscovery: true,
              mobileMoney: false,
              bankRails: false,
              virtualCards: false,
              billPayments: false,
            },
          });
        });
    });

    it('should allow deployment config to drive country rails without mobile hardcoding', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key !== 'app.supportedCountries') return undefined;
        return [
          {
            code: 'US',
            dialCode: '+1',
            name: 'United States',
            nameEn: 'United States',
            nameFr: 'États-Unis',
            flag: '🇺🇸',
            currency: 'USD',
            defaultLocale: 'en-US',
            supportedLocales: ['en-US', 'fr'],
            region: 'north_america',
            market: 'active',
            paymentRails: ['usdc', 'bank'],
            mobileMoneyProviders: [],
            depositMethods: ['usdc', 'bank'],
            withdrawalMethods: ['usdc', 'bank'],
            availability: {
              onboarding: 'open',
              deposits: 'available',
              withdrawals: 'available',
              bankLinking: 'available',
              cards: 'waitlist',
              billPayments: 'disabled',
            },
            features: {
              usdcWallet: true,
              internalTransfers: true,
              contactDiscovery: true,
              mobileMoney: false,
              bankRails: true,
              virtualCards: false,
              billPayments: false,
            },
          },
        ];
      });

      await request(app.getHttpServer())
        .get('/api/v1/config/countries')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(1);
          expect(body[0]).toMatchObject({
            code: 'US',
            paymentRails: ['usdc', 'bank'],
            mobileMoneyProviders: [],
            depositMethods: ['usdc', 'bank'],
            withdrawalMethods: ['usdc', 'bank'],
            availability: {
              onboarding: 'open',
              bankLinking: 'available',
            },
            features: {
              mobileMoney: false,
              bankRails: true,
            },
          });
        });
    });
  });
});
