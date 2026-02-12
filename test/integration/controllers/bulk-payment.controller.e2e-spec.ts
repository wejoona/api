/**
 * Bulk Payment Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockBulkPaymentService = {
  getBatches: jest.fn(),
  createBatch: jest.fn(),
  getBatch: jest.fn(),
  getFailedReport: jest.fn(),
};

import { BulkPaymentController } from '@modules/bulk-payments/application/controllers/bulk-payment.controller';
import { BulkPaymentService } from '@modules/bulk-payments/application/services/bulk-payment.service';

describe('BulkPaymentController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [BulkPaymentController],
      providers: [
        { provide: BulkPaymentService, useValue: mockBulkPaymentService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/bulk-payments/batches', () => {
    it('should list batches (200)', async () => {
      mockBulkPaymentService.getBatches.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/bulk-payments/batches').expect(200);
    });
  });

  describe('POST /api/v1/bulk-payments/batches', () => {
    it('should create batch (201)', async () => {
      mockBulkPaymentService.createBatch.mockResolvedValue({ id: 'batch_123', status: 'processing' });
      await request(app.getHttpServer())
        .post('/api/v1/bulk-payments/batches')
        .send({
          payments: [
            { recipientPhone: '+2250701234568', amount: 50 },
            { recipientPhone: '+2250701234569', amount: 30 },
          ],
        })
        .expect(201);
    });
  });

  describe('GET /api/v1/bulk-payments/batches/:id', () => {
    it('should get batch (200)', async () => {
      mockBulkPaymentService.getBatch.mockResolvedValue({ id: 'batch_123', status: 'completed' });
      await request(app.getHttpServer()).get('/api/v1/bulk-payments/batches/batch_123').expect(200);
    });
  });

  describe('GET /api/v1/bulk-payments/batches/:id/failed-report', () => {
    it('should get failed report (200)', async () => {
      mockBulkPaymentService.getFailedReport.mockResolvedValue({ failures: [] });
      await request(app.getHttpServer()).get('/api/v1/bulk-payments/batches/batch_123/failed-report').expect(200);
    });
  });
});
