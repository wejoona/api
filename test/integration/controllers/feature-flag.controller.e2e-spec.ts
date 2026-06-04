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

    it('should return mobile-safe dependency failure metadata (503)', async () => {
      mockFeatureFlagService.getEnabledFlagsForContext.mockRejectedValue(
        new Error('feature flag store unavailable'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/me')
        .expect(503);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'FEATURE_FLAG_DEPENDENCY_UNAVAILABLE',
          dependency: 'feature_flag_store',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/feature-flags/me',
          method: 'GET',
        },
      });
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

    it('should return mobile-safe dependency failure metadata (503)', async () => {
      mockFeatureFlagService.isEnabled.mockRejectedValue(
        new Error('feature flag store unavailable'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/check/payment_links')
        .expect(503);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'FEATURE_FLAG_DEPENDENCY_UNAVAILABLE',
          dependency: 'feature_flag_store',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/feature-flags/check/payment_links',
          method: 'GET',
        },
      });
    });
  });
});
