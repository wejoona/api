/**
 * Analytics Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockAnalyticsService = {
  getSpendingByCategory: jest.fn(),
  getIncomeVsExpenses: jest.fn(),
  getMonthlyTrends: jest.fn(),
};
const mockWalletRepository = {
  findByUserId: jest.fn(),
};

import { AnalyticsController } from '@modules/analytics/application/controllers/analytics.controller';
import { AnalyticsService } from '@modules/analytics/application/services/analytics.service';
import { WALLET_REPOSITORY } from '@modules/wallet/domain/repositories/wallet.repository';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: WALLET_REPOSITORY, useValue: mockWalletRepository },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletRepository.findByUserId.mockResolvedValue({
      id: '660e8400-e29b-41d4-a716-446655440000',
    });
  });

  describe('GET /api/v1/analytics/spending-by-category', () => {
    it('should return spending analytics (200)', async () => {
      mockAnalyticsService.getSpendingByCategory.mockResolvedValue({
        total: 500,
        categories: [],
      });
      await request(app.getHttpServer())
        .get('/api/v1/analytics/spending-by-category')
        .expect(200);
    });
  });

  describe('GET /api/v1/analytics/income-vs-expenses', () => {
    it('should return income analytics (200)', async () => {
      mockAnalyticsService.getIncomeVsExpenses.mockResolvedValue({
        total: 1000,
      });
      await request(app.getHttpServer())
        .get('/api/v1/analytics/income-vs-expenses')
        .expect(200);
    });
  });

  describe('GET /api/v1/analytics/monthly-trends', () => {
    it('should return monthly trends (200)', async () => {
      mockAnalyticsService.getMonthlyTrends.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/analytics/monthly-trends')
        .expect(200);
    });
  });
});
