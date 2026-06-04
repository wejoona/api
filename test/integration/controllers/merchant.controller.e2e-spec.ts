/**
 * Merchant Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockRegisterMerchant = { execute: jest.fn() };
const mockCreatePaymentRequest = { execute: jest.fn() };
const mockProcessPayment = { execute: jest.fn() };
const mockGetMerchant = { execute: jest.fn() };
const mockGetMerchantByQr = { execute: jest.fn() };
const mockGetAnalytics = { execute: jest.fn() };
const mockGetTransactions = { execute: jest.fn() };
const mockQrCodeService = { generate: jest.fn() };

import {
  MerchantCompatController,
  MerchantController,
} from '@modules/merchant/application/controllers';
import {
  RegisterMerchantUseCase,
  CreatePaymentRequestUseCase,
  ProcessMerchantPaymentUseCase,
  GetMerchantUseCase,
  GetMerchantByQrUseCase,
  GetMerchantAnalyticsUseCase,
  GetMerchantTransactionsUseCase,
  QrCodeService,
} from '@modules/merchant/application/usecases';

function merchantResponse() {
  return {
    merchantId: '550e8400-e29b-41d4-a716-446655440077',
    businessName: 'Test Shop',
    displayName: 'Test Shop',
    category: 'retail',
    country: 'CI',
    walletId: '660e8400-e29b-41d4-a716-446655440000',
    qrCode:
      'joonapay://pay?v=1&t=static&m=550e8400-e29b-41d4-a716-446655440077',
    qrCodeUrl: 'https://example.com/merchant-qr.png',
    isVerified: true,
    feePercent: 1,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
    dailyVolume: 0,
    monthlyVolume: 0,
    remainingDailyLimit: 100000,
    remainingMonthlyLimit: 1000000,
    totalTransactions: 0,
    status: 'active',
    businessAddress: null,
    businessPhone: null,
    businessEmail: null,
    logoUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('MerchantController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [MerchantController],
      providers: [
        { provide: RegisterMerchantUseCase, useValue: mockRegisterMerchant },
        {
          provide: CreatePaymentRequestUseCase,
          useValue: mockCreatePaymentRequest,
        },
        {
          provide: ProcessMerchantPaymentUseCase,
          useValue: mockProcessPayment,
        },
        { provide: GetMerchantUseCase, useValue: mockGetMerchant },
        { provide: GetMerchantByQrUseCase, useValue: mockGetMerchantByQr },
        { provide: GetMerchantAnalyticsUseCase, useValue: mockGetAnalytics },
        {
          provide: GetMerchantTransactionsUseCase,
          useValue: mockGetTransactions,
        },
        { provide: QrCodeService, useValue: mockQrCodeService },
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

  describe('POST /api/v1/merchants/register', () => {
    it('should register merchant (201)', async () => {
      mockRegisterMerchant.execute.mockResolvedValue(TestData.merchant());
      await request(app.getHttpServer())
        .post('/api/v1/merchants/register')
        .send({ businessName: 'Test Shop', category: 'retail', country: 'CI' })
        .expect(201);
    });
  });

  describe('GET /api/v1/merchants/me', () => {
    it('should get current merchant (200)', async () => {
      mockGetMerchant.execute.mockResolvedValue(TestData.merchant());
      await request(app.getHttpServer())
        .get('/api/v1/merchants/me')
        .expect(200);
    });
  });

  describe('GET /api/v1/merchants/:id', () => {
    it('should get merchant by id (200)', async () => {
      mockGetMerchant.execute.mockResolvedValue(TestData.merchant());
      await request(app.getHttpServer())
        .get('/api/v1/merchants/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/merchants/decode-qr', () => {
    it('should decode QR code (200)', async () => {
      mockGetMerchantByQr.execute.mockResolvedValue(TestData.merchant());
      await request(app.getHttpServer())
        .post('/api/v1/merchants/decode-qr')
        .send({ qrData: 'QR_TEST_123' })
        .expect(200);
    });
  });

  describe('POST /api/v1/merchants/:id/payment-request', () => {
    it('should create payment request (201)', async () => {
      mockCreatePaymentRequest.execute.mockResolvedValue({
        id: 'pr_123',
        amount: 50,
      });
      await request(app.getHttpServer())
        .post(
          '/api/v1/merchants/550e8400-e29b-41d4-a716-446655440000/payment-request',
        )
        .send({ amount: 50, description: 'Coffee' })
        .expect(201);
    });
  });

  describe('POST /api/v1/merchants/pay', () => {
    it('should process payment (200)', async () => {
      mockProcessPayment.execute.mockResolvedValue({
        success: true,
        transactionId: 'tx_123',
      });
      await request(app.getHttpServer())
        .post('/api/v1/merchants/pay')
        .send({
          qrData:
            'joonapay://pay?v=1&t=static&m=550e8400-e29b-41d4-a716-446655440000',
          amount: 50,
        })
        .expect(200);
    });
  });

  describe('GET /api/v1/merchants/:id/transactions', () => {
    it('should list merchant transactions (200)', async () => {
      mockGetTransactions.execute.mockResolvedValue({
        transactions: [],
        total: 0,
      });
      await request(app.getHttpServer())
        .get(
          '/api/v1/merchants/550e8400-e29b-41d4-a716-446655440000/transactions',
        )
        .expect(200);
    });
  });

  describe('GET /api/v1/merchants/:id/analytics', () => {
    it('should get merchant analytics (200)', async () => {
      mockGetAnalytics.execute.mockResolvedValue({
        totalRevenue: 5000,
        totalTransactions: 100,
      });
      await request(app.getHttpServer())
        .get('/api/v1/merchants/550e8400-e29b-41d4-a716-446655440000/analytics')
        .expect(200);
    });
  });
});

describe('MerchantCompatController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [MerchantCompatController],
      providers: [
        {
          provide: ProcessMerchantPaymentUseCase,
          useValue: mockProcessPayment,
        },
        { provide: GetMerchantUseCase, useValue: mockGetMerchant },
        { provide: GetMerchantAnalyticsUseCase, useValue: mockGetAnalytics },
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

  describe('POST /api/v1/merchant/payments', () => {
    it('should process payment through the singular mobile alias', async () => {
      mockProcessPayment.execute.mockResolvedValue({
        success: true,
        transactionId: 'tx_123',
      });

      await request(app.getHttpServer())
        .post('/api/v1/merchant/payments')
        .send({
          qrData:
            'joonapay://pay?v=1&t=static&m=550e8400-e29b-41d4-a716-446655440000',
          amount: 50,
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            success: true,
            transactionId: 'tx_123',
          });
        });

      expect(mockProcessPayment.execute).toHaveBeenCalledWith({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        qrData:
          'joonapay://pay?v=1&t=static&m=550e8400-e29b-41d4-a716-446655440000',
        amount: 50,
      });
    });
  });

  describe('GET /api/v1/merchant/qr', () => {
    it('should return current merchant QR through the singular mobile alias', async () => {
      mockGetMerchant.execute.mockResolvedValue(merchantResponse());

      await request(app.getHttpServer())
        .get('/api/v1/merchant/qr')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            merchantId: expect.any(String),
            merchantName: expect.any(String),
            qrCode: expect.any(String),
          });
        });
    });
  });

  describe('GET /api/v1/merchant/dashboard', () => {
    it('should return current merchant and analytics through the singular mobile alias', async () => {
      const merchant = merchantResponse();
      mockGetMerchant.execute.mockResolvedValue(merchant);
      mockGetAnalytics.execute.mockResolvedValue({
        merchantId: merchant.merchantId,
        merchantName: merchant.displayName,
        period: 'month',
        totalRevenue: 5000,
        totalTransactions: 100,
      });

      await request(app.getHttpServer())
        .get('/api/v1/merchant/dashboard')
        .expect(200)
        .expect(({ body }) => {
          expect(body.merchant).toMatchObject({
            merchantId: merchant.merchantId,
          });
          expect(body.analytics).toMatchObject({
            merchantId: merchant.merchantId,
            totalRevenue: 5000,
          });
        });

      expect(mockGetAnalytics.execute).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: merchant.merchantId,
        period: 'month',
      });
    });
  });
});
