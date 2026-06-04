/**
 * App Config Controller Integration Tests
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { AppConfigController } from '@modules/app-config/app-config.controller';

describe('AppConfigController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AppConfigController],
      providers: [],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
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
          });
          expect(us).toMatchObject({
            dialCode: '+1',
            currency: 'USD',
            defaultLocale: 'en-US',
            region: 'north_america',
            market: 'active',
            paymentRails: ['usdc'],
            mobileMoneyProviders: [],
          });
        });
    });
  });
});
