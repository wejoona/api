/**
 * Bill Payment Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockBillPayClient = {
  getProviders: jest.fn(),
  getCategories: jest.fn(),
  validateAccount: jest.fn(),
  payBill: jest.fn(),
  getPaymentHistory: jest.fn(),
  getReceipt: jest.fn(),
  getPaymentById: jest.fn(),
};

import { BillPaymentController } from '@modules/bill-payments/application/controllers/bill-payment.controller';
import { BillPayClientService } from '@modules/bill-payments/infrastructure/services/bill-pay-client.service';

describe('BillPaymentController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [BillPaymentController],
      providers: [
        { provide: BillPayClientService, useValue: mockBillPayClient },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/bill-payments/providers', () => {
    it('should list providers (200)', async () => {
      mockBillPayClient.getProviders.mockResolvedValue([{ id: 'cie', name: 'CIE Electricity' }]);
      await request(app.getHttpServer()).get('/api/v1/bill-payments/providers').expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/categories', () => {
    it('should list categories (200)', async () => {
      mockBillPayClient.getCategories.mockResolvedValue([{ id: 'electricity', name: 'Electricity' }]);
      await request(app.getHttpServer()).get('/api/v1/bill-payments/categories').expect(200);
    });
  });

  describe('POST /api/v1/bill-payments/validate', () => {
    it('should validate account (200)', async () => {
      mockBillPayClient.validateAccount.mockResolvedValue({ valid: true, accountName: 'John Doe' });
      await request(app.getHttpServer())
        .post('/api/v1/bill-payments/validate')
        .send({ providerId: 'cie', accountNumber: '123456' })
        .expect(200);
    });
  });

  describe('POST /api/v1/bill-payments/pay', () => {
    it('should pay bill (200)', async () => {
      mockBillPayClient.payBill.mockResolvedValue({ success: true, reference: 'BP_123' });
      await request(app.getHttpServer())
        .post('/api/v1/bill-payments/pay')
        .send({ providerId: 'cie', accountNumber: '123456', amount: 5000 })
        .expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/history', () => {
    it('should list payment history (200)', async () => {
      mockBillPayClient.getPaymentHistory.mockResolvedValue({ payments: [], total: 0 });
      await request(app.getHttpServer()).get('/api/v1/bill-payments/history').expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/:id', () => {
    it('should get bill payment (200)', async () => {
      mockBillPayClient.getPaymentById.mockResolvedValue({ id: '123', status: 'completed' });
      await request(app.getHttpServer()).get('/api/v1/bill-payments/123').expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/:id/receipt', () => {
    it('should get receipt (200)', async () => {
      mockBillPayClient.getReceipt.mockResolvedValue({ receipt: 'base64data' });
      await request(app.getHttpServer()).get('/api/v1/bill-payments/123/receipt').expect(200);
    });
  });
});
