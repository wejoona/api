/**
 * Payment Link Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { AppException } from '@/common/exceptions';

const mockPaymentLinkService = {
  createPaymentLink: jest.fn(),
  getPaymentLinks: jest.fn(),
  getPaymentLinkById: jest.fn(),
  getPaymentLinkByCode: jest.fn(),
  refreshPaymentLink: jest.fn(),
  cancelPaymentLink: jest.fn(),
  payPaymentLink: jest.fn(),
  deletePaymentLink: jest.fn(),
};

import { PaymentLinkController } from '@modules/payment-links/application/controllers/payment-link.controller';
import { PaymentLinkService } from '@modules/payment-links/application/services/payment-link.service';

function paymentLinkResponse(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    walletId: '660e8400-e29b-41d4-a716-446655440000',
    code: 'PAY123ABC',
    shortCode: 'PAY123ABC',
    amount: 25,
    currency: 'USDC',
    recipientName: 'Korido user',
    description: 'Test payment',
    status: 'active',
    expiresAt: now,
    paidAt: null,
    paidByUserId: null,
    paidByPhone: null,
    paidByName: null,
    transactionId: null,
    viewCount: 0,
    isExpired: false,
    isActive: true,
    isFlexibleAmount: false,
    url: 'https://app.korido.co/pay/PAY123ABC',
    shareUrl: 'https://app.korido.co/pay/PAY123ABC',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

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
      mockPaymentLinkService.createPaymentLink.mockResolvedValue(
        paymentLinkResponse(),
      );
      await request(app.getHttpServer())
        .post('/api/v1/payment-links')
        .send({ amount: 25, currency: 'USDC', description: 'Test payment' })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: '550e8400-e29b-41d4-a716-446655440000',
            code: 'PAY123ABC',
            shortCode: 'PAY123ABC',
            recipientName: 'Korido user',
            url: 'https://app.korido.co/pay/PAY123ABC',
          });
        });

      expect(mockPaymentLinkService.createPaymentLink).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { amount: 25, currency: 'USDC', description: 'Test payment' },
      );
    });
  });

  describe('GET /api/v1/payment-links', () => {
    it('should list payment links (200)', async () => {
      mockPaymentLinkService.getPaymentLinks.mockResolvedValue({
        links: [paymentLinkResponse()],
        total: 1,
      });
      await request(app.getHttpServer())
        .get('/api/v1/payment-links')
        .expect(200)
        .expect(({ body }) => {
          expect(body.total).toBe(1);
          expect(body.links).toHaveLength(1);
          expect(body.links[0]).toMatchObject({
            code: 'PAY123ABC',
            shortCode: 'PAY123ABC',
            url: 'https://app.korido.co/pay/PAY123ABC',
          });
        });
    });
  });

  describe('GET /api/v1/payment-links/:id', () => {
    it('should get payment link (200)', async () => {
      mockPaymentLinkService.getPaymentLinkById.mockResolvedValue(
        paymentLinkResponse(),
      );
      await request(app.getHttpServer())
        .get('/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000')
        .expect(200)
        .expect(({ body }) => {
          expect(body.shortCode).toBe('PAY123ABC');
          expect(body.recipientName).toBe('Korido user');
        });
    });

    it('should return a deterministic forbidden ownership envelope (403)', async () => {
      mockPaymentLinkService.getPaymentLinkById.mockRejectedValue(
        AppException.forbidden('PAYMENT_LINK_FORBIDDEN', 'Access denied'),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PAYMENT_LINK_FORBIDDEN',
          message: 'Access denied',
        },
        meta: {
          path: '/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000',
          method: 'GET',
        },
      });
    });
  });

  describe('GET /api/v1/payment-links/code/:code', () => {
    it('should get payment link by code (200) - public endpoint', async () => {
      mockPaymentLinkService.getPaymentLinkByCode.mockResolvedValue(
        paymentLinkResponse({ viewCount: 1 }),
      );
      await request(app.getHttpServer())
        .get('/api/v1/payment-links/code/PAY123ABC')
        .expect(200)
        .expect(({ body }) => {
          expect(body.code).toBe('PAY123ABC');
          expect(body.viewCount).toBe(1);
        });
    });
  });

  describe('PATCH /api/v1/payment-links/:id/cancel', () => {
    it('should cancel payment link (200)', async () => {
      mockPaymentLinkService.cancelPaymentLink.mockResolvedValue({
        success: true,
        message: 'Payment link cancelled',
      });
      await request(app.getHttpServer())
        .patch(
          '/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000/cancel',
        )
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            success: true,
            message: 'Payment link cancelled',
          });
        });
    });
  });

  describe('POST /api/v1/payment-links/code/:code/pay', () => {
    it('should pay payment link (200)', async () => {
      mockPaymentLinkService.payPaymentLink.mockResolvedValue({
        transactionId: 'tx_123',
        amount: 25,
        amountDecimal: '25.000000',
        currency: 'USDC',
        status: 'completed',
        supportReference: 'tx_123',
        ledgerReference: 'pl_PAY123ABC_1234567890',
        ledgerTransactionId: 'blnk_pl_123',
      });
      await request(app.getHttpServer())
        .post('/api/v1/payment-links/code/PAY123ABC/pay')
        .send({ amount: 25 })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            transactionId: 'tx_123',
            amount: 25,
            amountDecimal: '25.000000',
            currency: 'USDC',
            status: 'completed',
            supportReference: 'tx_123',
            ledgerReference: 'pl_PAY123ABC_1234567890',
            ledgerTransactionId: 'blnk_pl_123',
          });
        });
    });
  });

  describe('DELETE /api/v1/payment-links/:id', () => {
    it('should delete payment link (200)', async () => {
      mockPaymentLinkService.deletePaymentLink.mockResolvedValue({
        success: true,
        message: 'Payment link deleted',
      });
      await request(app.getHttpServer())
        .delete('/api/v1/payment-links/550e8400-e29b-41d4-a716-446655440000')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            success: true,
            message: 'Payment link deleted',
          });
        });
    });
  });
});
