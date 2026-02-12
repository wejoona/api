/**
 * Analytics Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockAnalyticsService = {
  getSpendingAnalytics: jest.fn(),
  getIncomeAnalytics: jest.fn(),
  getCategoryBreakdown: jest.fn(),
  getMonthlyTrends: jest.fn(),
};

import { AnalyticsController } from '@modules/analytics/application/controllers/analytics.controller';
import { AnalyticsService } from '@modules/analytics/application/services/analytics.service';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/analytics/spending', () => {
    it('should return spending analytics (200)', async () => {
      mockAnalyticsService.getSpendingAnalytics.mockResolvedValue({ total: 500, categories: [] });
      await request(app.getHttpServer()).get('/api/v1/analytics/spending').expect(200);
    });
  });

  describe('GET /api/v1/analytics/income', () => {
    it('should return income analytics (200)', async () => {
      mockAnalyticsService.getIncomeAnalytics.mockResolvedValue({ total: 1000 });
      await request(app.getHttpServer()).get('/api/v1/analytics/income').expect(200);
    });
  });

  describe('GET /api/v1/analytics/trends', () => {
    it('should return monthly trends (200)', async () => {
      mockAnalyticsService.getMonthlyTrends.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/analytics/trends').expect(200);
    });
  });
});
