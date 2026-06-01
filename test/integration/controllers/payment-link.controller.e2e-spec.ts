/**
 * Payment Link Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockPaymentLinkService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  refresh: jest.fn(),
  cancel: jest.fn(),
  pay: jest.fn(),
  delete: jest.fn(),
};

import { PaymentLinkController } from '@modules/payment-links/application/controllers/payment-link.controller';
import { PaymentLinkService } from '@modules/payment-links/application/services/payment-link.service';

describe('PaymentLinkController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [PaymentLinkController],
      providers: [
        { provide: PaymentLinkService, useValue: mockPaymentLinkService },
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

  describe('POST /api/v1/payment-links', () => {
    it('should create payment link (201)', async () => {
      mockPaymentLinkService.create.mockResolvedValue(TestData.paymentLink());
      await request(app.getHttpServer())
        .post('/api/v1/payment-links')
        .send({ amount: 25, currency: 'USDC', description: 'Test payment' })
        .expect(201);
    });
  });

  describe('GET /api/v1/payment-links', () => {
    it('should list payment links (200)', async () => {
      mockPaymentLinkService.findAll.mockResolvedValue([
        TestData.paymentLink(),
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/payment-links')
        .expect(200);
    });
  });

  describe('GET /api/v1/payment-links/:id', () => {
    it('should get payment link (200)', async () => {
      mockPaymentLinkService.findById.mockResolvedValue(TestData.paymentLink());
      await request(app.getHttpServer())
        .get('/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('GET /api/v1/payment-links/code/:code', () => {
    it('should get payment link by code (200) - public endpoint', async () => {
      mockPaymentLinkService.findByCode.mockResolvedValue(
        TestData.paymentLink(),
      );
      await request(app.getHttpServer())
        .get('/api/v1/payment-links/code/PAY123ABC')
        .expect(200);
    });
  });

  describe('PATCH /api/v1/payment-links/:id/cancel', () => {
    it('should cancel payment link (200)', async () => {
      mockPaymentLinkService.cancel.mockResolvedValue(
        TestData.paymentLink({ status: 'cancelled' }),
      );
      await request(app.getHttpServer())
        .patch(
          '/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000/cancel',
        )
        .expect(200);
    });
  });

  describe('POST /api/v1/payment-links/code/:code/pay', () => {
    it('should pay payment link (200)', async () => {
      mockPaymentLinkService.pay.mockResolvedValue({
        success: true,
        transactionId: 'tx_123',
      });
      await request(app.getHttpServer())
        .post('/api/v1/payment-links/code/PAY123ABC/pay')
        .send({ amount: 25 })
        .expect(200);
    });
  });

  describe('DELETE /api/v1/payment-links/:id', () => {
    it('should delete payment link (200)', async () => {
      mockPaymentLinkService.delete.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
