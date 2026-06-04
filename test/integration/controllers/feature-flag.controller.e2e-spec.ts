/**
 * Feature Flag Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockFeatureFlagService = {
  getEnabledFlagsForContext: jest.fn(),
  isEnabled: jest.fn(),
};

import { FeatureFlagController } from '@modules/feature-flag/application/controllers/feature-flag.controller';
import { FeatureFlagService } from '@modules/feature-flag/application/services/feature-flag.service';

describe('FeatureFlagController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [FeatureFlagController],
      providers: [
        { provide: FeatureFlagService, useValue: mockFeatureFlagService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/feature-flags/me', () => {
    it('should list flat feature flags for mobile bootstrap (200)', async () => {
      mockFeatureFlagService.getEnabledFlagsForContext.mockResolvedValue({
        deposit: true,
        payment_links: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/me')
        .query({ appVersion: '1.2.3', platform: 'ios' })
        .expect(200);

      expect(mockFeatureFlagService.getEnabledFlagsForContext).toHaveBeenCalledWith(
        {
          userId: expect.any(String),
          countryCode: 'CI',
          appVersion: '1.2.3',
          platform: 'ios',
        },
      );
      expect(res.body).toEqual({
        deposit: true,
        payment_links: false,
      });
      expect(res.body).not.toHaveProperty('flags');
    });
  });

  describe('GET /api/v1/feature-flags/check/:key', () => {
    it('should get specific flag (200)', async () => {
      mockFeatureFlagService.isEnabled.mockResolvedValue(true);
      const res = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/check/payment_links')
        .query({ appVersion: '1.2.3', platform: 'android' })
        .expect(200);

      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith(
        'payment_links',
        {
          userId: expect.any(String),
          countryCode: 'CI',
          appVersion: '1.2.3',
          platform: 'android',
        },
      );
      expect(res.body).toEqual({
        key: 'payment_links',
        enabled: true,
      });
    });
  });
});
