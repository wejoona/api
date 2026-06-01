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
    it('should list feature flags (200)', async () => {
      mockFeatureFlagService.getEnabledFlagsForContext.mockResolvedValue({
        new_ui: true,
      });
      await request(app.getHttpServer())
        .get('/api/v1/feature-flags/me')
        .expect(200);
    });
  });

  describe('GET /api/v1/feature-flags/check/:key', () => {
    it('should get specific flag (200)', async () => {
      mockFeatureFlagService.isEnabled.mockResolvedValue(true);
      await request(app.getHttpServer())
        .get('/api/v1/feature-flags/check/new_ui')
        .expect(200);
    });
  });
});
