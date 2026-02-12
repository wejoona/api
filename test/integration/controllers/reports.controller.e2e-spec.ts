/**
 * Reports Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockReportsService = {
  getTransactionReport: jest.fn(),
  getRevenueReport: jest.fn(),
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
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/reports/transactions', () => {
    it('should return transaction report (200)', async () => {
      mockReportsService.getTransactionReport.mockResolvedValue({ data: [], total: 0 });
      await request(app.getHttpServer()).get('/api/v1/reports/transactions').expect(200);
    });
  });

  describe('GET /api/v1/reports/revenue', () => {
    it('should return revenue report (200)', async () => {
      mockReportsService.getRevenueReport.mockResolvedValue({ total: 50000 });
      await request(app.getHttpServer()).get('/api/v1/reports/revenue').expect(200);
    });
  });
});
