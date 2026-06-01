/**
 * Reports Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_ADMIN } from '../setup/test-app';

const mockReportsService = {
  getTransactionSummary: jest.fn(),
  getDailyTransactionReport: jest.fn(),
  exportReport: jest.fn(),
};

import { ReportsController } from '@modules/reports/application/controllers/reports.controller';
import { ReportsService } from '@modules/reports/application/services/reports.service';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
      authUser: TEST_ADMIN,
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/reports/transactions/summary', () => {
    it('should return transaction summary (200)', async () => {
      mockReportsService.getTransactionSummary.mockResolvedValue({
        totalCount: 0,
        totalVolume: 0,
        avgTransactionSize: 0,
        byStatus: [],
        byType: [],
        byCurrency: [],
      });
      await request(app.getHttpServer())
        .get('/api/v1/reports/transactions/summary')
        .expect(200);
    });
  });

  describe('GET /api/v1/reports/transactions/daily', () => {
    it('should return daily transaction report (200)', async () => {
      mockReportsService.getDailyTransactionReport.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get(
          '/api/v1/reports/transactions/daily?startDate=2026-01-01&endDate=2026-01-31',
        )
        .expect(200);
    });
  });
});
