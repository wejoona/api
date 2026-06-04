/**
 * Bill Payment Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { AppException } from '@/common/exceptions';
import { ERROR_CODES } from '@/common/constants/error-codes';

const mockBillPayClient = {
  getProviders: jest.fn(),
  getCategories: jest.fn(),
  lookupBill: jest.fn(),
  payBill: jest.fn(),
  listPayments: jest.fn(),
  getPayment: jest.fn(),
};
const PROVIDER_ID = '550e8400-e29b-41d4-a716-446655440210';

import { BillPaymentController } from '@modules/bill-payments/application/controllers/bill-payment.controller';
import { BillPayClientService } from '@modules/bill-payments/infrastructure/services/bill-pay-client.service';

function billPaymentsUnavailable() {
  return AppException.badRequest(
    ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
    'Bill payments are not available right now',
    undefined,
    {
      reason: 'provider_or_feature_disabled',
      featureReason: 'bill_pay_unavailable',
      provider: 'bill-pay',
      retryable: true,
      supportReviewRequired: false,
    },
  );
}

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

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/v1/bill-payments/providers', () => {
    it('should list providers (200)', async () => {
      mockBillPayClient.getProviders.mockResolvedValue([
        { id: 'cie', name: 'CIE Electricity' },
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/bill-payments/providers')
        .expect(200);
    });

    it('should return a deterministic unavailable-provider envelope (400)', async () => {
      mockBillPayClient.getProviders.mockRejectedValue(
        AppException.badRequest(
          ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
          'Bill payments are not available right now',
          undefined,
          {
            reason: 'provider_or_feature_disabled',
            featureReason: 'bill_pay_unavailable',
            provider: 'bill-pay',
          },
        ),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/bill-payments/providers')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
          reason: 'provider_or_feature_disabled',
          featureReason: 'bill_pay_unavailable',
          provider: 'bill-pay',
        },
        meta: {
          path: '/api/v1/bill-payments/providers',
          method: 'GET',
        },
      });
    });
  });

  describe('GET /api/v1/bill-payments/categories', () => {
    it('should list categories (200)', async () => {
      mockBillPayClient.getCategories.mockResolvedValue([
        { id: 'electricity', name: 'Electricity' },
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/bill-payments/categories')
        .expect(200);
    });
  });

  describe('POST /api/v1/bill-payments/validate', () => {
    it('should validate account (200)', async () => {
      mockBillPayClient.lookupBill.mockResolvedValue({
        valid: true,
        accountName: 'John Doe',
      });
      await request(app.getHttpServer())
        .post('/api/v1/bill-payments/validate')
        .send({ providerId: PROVIDER_ID, accountNumber: '123456' })
        .expect(200);
    });

    it('should return unavailable metadata when bill validation provider is down', async () => {
      mockBillPayClient.lookupBill.mockRejectedValue(
        billPaymentsUnavailable(),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/bill-payments/validate')
        .send({ providerId: PROVIDER_ID, accountNumber: '123456' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
          reason: 'provider_or_feature_disabled',
          featureReason: 'bill_pay_unavailable',
          provider: 'bill-pay',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/bill-payments/validate',
          method: 'POST',
        },
      });
    });
  });

  describe('POST /api/v1/bill-payments/pay', () => {
    it('should pay bill (200)', async () => {
      const idempotencyKey = `bill-pay-idempotency-${Date.now()}`;
      mockBillPayClient.payBill.mockResolvedValue({
        success: true,
        reference: 'BP_123',
      });
      await request(app.getHttpServer())
        .post('/api/v1/bill-payments/pay')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          providerId: PROVIDER_ID,
          accountNumber: '123456',
          amount: 5000,
        })
        .expect(201);

      expect(mockBillPayClient.payBill).toHaveBeenCalledWith(
        TEST_USER.id,
        {
          providerId: PROVIDER_ID,
          accountNumber: '123456',
          meterNumber: undefined,
          customerName: undefined,
          amount: 5000,
          currency: undefined,
          phone: undefined,
          email: undefined,
        },
        idempotencyKey,
      );
    });

    it('should return unavailable metadata when bill payment provider is down', async () => {
      const idempotencyKey = `bill-pay-idempotency-${Date.now()}-unavailable`;
      mockBillPayClient.payBill.mockRejectedValue(billPaymentsUnavailable());

      const response = await request(app.getHttpServer())
        .post('/api/v1/bill-payments/pay')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          providerId: PROVIDER_ID,
          accountNumber: '123456',
          amount: 5000,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
          reason: 'provider_or_feature_disabled',
          featureReason: 'bill_pay_unavailable',
          provider: 'bill-pay',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/bill-payments/pay',
          method: 'POST',
        },
      });
    });
  });

  describe('GET /api/v1/bill-payments/history', () => {
    it('should list payment history (200)', async () => {
      mockBillPayClient.listPayments.mockResolvedValue({
        payments: [],
        total: 0,
      });
      await request(app.getHttpServer())
        .get('/api/v1/bill-payments/history')
        .expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/:id', () => {
    it('should get bill payment (200)', async () => {
      mockBillPayClient.getPayment.mockResolvedValue({
        id: '123',
        status: 'completed',
      });
      await request(app.getHttpServer())
        .get('/api/v1/bill-payments/123')
        .expect(200);
    });
  });

  describe('GET /api/v1/bill-payments/:id/receipt', () => {
    it('should get receipt (200)', async () => {
      mockBillPayClient.getPayment.mockResolvedValue({ receipt: 'base64data' });
      await request(app.getHttpServer())
        .get('/api/v1/bill-payments/123/receipt')
        .expect(200);
    });
  });
});
