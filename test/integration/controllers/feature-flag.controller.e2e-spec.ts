/**
 * Feature Flag Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockFeatureFlagService = {
  getFlags: jest.fn(),
  getFlag: jest.fn(),
  createFlag: jest.fn(),
  updateFlag: jest.fn(),
  deleteFlag: jest.fn(),
};

import { FeatureFlagController } from '@modules/feature-flag/application/controllers/feature-flag.controller';
import { FeatureFlagService } from '@modules/feature-flag/application/services/feature-flag.service';

describe('FeatureFlagController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [FeatureFlagController],
      providers: [{ provide: FeatureFlagService, useValue: mockFeatureFlagService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/feature-flags', () => {
    it('should list feature flags (200)', async () => {
      mockFeatureFlagService.getFlags.mockResolvedValue([{ name: 'new_ui', enabled: true }]);
      await request(app.getHttpServer()).get('/api/v1/feature-flags').expect(200);
    });
  });

  describe('GET /api/v1/feature-flags/:name', () => {
    it('should get specific flag (200)', async () => {
      mockFeatureFlagService.getFlag.mockResolvedValue({ name: 'new_ui', enabled: true });
      await request(app.getHttpServer()).get('/api/v1/feature-flags/new_ui').expect(200);
    });
  });
});
