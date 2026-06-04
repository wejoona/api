/**
 * Bank Linking Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockBankLinkingService = {
  getBanks: jest.fn(),
  getLinkedAccounts: jest.fn(),
  getLinkedAccount: jest.fn(),
  linkBankAccount: jest.fn(),
  verifyBankAccount: jest.fn(),
  deposit: jest.fn(),
  withdraw: jest.fn(),
  unlinkAccount: jest.fn(),
  isBankLinkingEnabled: jest.fn(),
  getBankLinkingProvider: jest.fn(),
  getUnavailableReason: jest.fn(),
  getUnavailableFeatureReason: jest.fn(),
};

import { BankLinkingController } from '@modules/bank-linking/application/controllers/bank-linking.controller';
import { BankLinkingService } from '@modules/bank-linking/application/services/bank-linking.service';

describe('BankLinkingController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [BankLinkingController],
      providers: [
        { provide: BankLinkingService, useValue: mockBankLinkingService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockBankLinkingService.isBankLinkingEnabled.mockReturnValue(true);
    mockBankLinkingService.getBankLinkingProvider.mockReturnValue(
      'test-bank-provider',
    );
    mockBankLinkingService.getUnavailableReason.mockReturnValue(null);
    mockBankLinkingService.getUnavailableFeatureReason.mockReturnValue(null);
  });

  describe('GET /api/v1/banks', () => {
    it('should list banks with mobile-safe capability metadata (200)', async () => {
      mockBankLinkingService.getBanks.mockResolvedValue([
        { id: 'tb001', name: 'Test Bank', country: 'CI' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/banks?country=CI')
        .expect(200);

      expect(response.body).toEqual({
        banks: [{ id: 'tb001', name: 'Test Bank', country: 'CI' }],
        data: [{ id: 'tb001', name: 'Test Bank', country: 'CI' }],
        available: true,
        status: 'available',
        reason: null,
        featureReason: null,
        provider: 'test-bank-provider',
        country: 'CI',
      });
      expect(mockBankLinkingService.getBanks).toHaveBeenCalledWith('CI');
    });

    it('should return region-aware unavailable state for CI when provider is disabled', async () => {
      mockBankLinkingService.getBanks.mockResolvedValue([]);
      mockBankLinkingService.isBankLinkingEnabled.mockReturnValue(false);
      mockBankLinkingService.getBankLinkingProvider.mockReturnValue(null);
      mockBankLinkingService.getUnavailableReason.mockReturnValue(
        'provider_or_feature_disabled',
      );
      mockBankLinkingService.getUnavailableFeatureReason.mockReturnValue(
        'bank_linking_unavailable',
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/banks?country=CI')
        .expect(200);

      expect(response.body).toEqual({
        banks: [],
        data: [],
        available: false,
        status: 'unavailable',
        reason: 'provider_or_feature_disabled',
        featureReason: 'bank_linking_unavailable',
        provider: null,
        country: 'CI',
      });
    });

    it('should return region-aware unavailable state for US when provider is disabled', async () => {
      mockBankLinkingService.getBanks.mockResolvedValue([]);
      mockBankLinkingService.isBankLinkingEnabled.mockReturnValue(false);
      mockBankLinkingService.getBankLinkingProvider.mockReturnValue(null);
      mockBankLinkingService.getUnavailableReason.mockReturnValue(
        'provider_or_feature_disabled',
      );
      mockBankLinkingService.getUnavailableFeatureReason.mockReturnValue(
        'bank_linking_unavailable',
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/banks?country=US')
        .expect(200);

      expect(response.body).toEqual({
        banks: [],
        data: [],
        available: false,
        status: 'unavailable',
        reason: 'provider_or_feature_disabled',
        featureReason: 'bank_linking_unavailable',
        provider: null,
        country: 'US',
      });
    });
  });

  describe('GET /api/v1/bank-accounts', () => {
    it('should list linked accounts with mobile-safe capability metadata (200)', async () => {
      mockBankLinkingService.getLinkedAccounts.mockResolvedValue([
        TestData.bankAccount(),
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/bank-accounts')
        .expect(200);

      expect(response.body.accounts).toHaveLength(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.available).toBe(true);
      expect(response.body.status).toBe('available');
      expect(response.body.reason).toBeNull();
      expect(response.body.featureReason).toBeNull();
      expect(response.body.provider).toBe('test-bank-provider');
    });

    it('should return a stable empty unavailable linked-account state (200)', async () => {
      mockBankLinkingService.getLinkedAccounts.mockResolvedValue([]);
      mockBankLinkingService.isBankLinkingEnabled.mockReturnValue(false);
      mockBankLinkingService.getBankLinkingProvider.mockReturnValue(null);
      mockBankLinkingService.getUnavailableReason.mockReturnValue(
        'provider_or_feature_disabled',
      );
      mockBankLinkingService.getUnavailableFeatureReason.mockReturnValue(
        'bank_linking_unavailable',
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/bank-accounts')
        .expect(200);

      expect(response.body).toEqual({
        accounts: [],
        data: [],
        available: false,
        status: 'unavailable',
        reason: 'provider_or_feature_disabled',
        featureReason: 'bank_linking_unavailable',
        provider: null,
      });
    });
  });

  describe('POST /api/v1/bank-accounts', () => {
    it('should link bank account (201)', async () => {
      mockBankLinkingService.linkBankAccount.mockResolvedValue(
        TestData.bankAccount(),
      );
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts')
        .send({
          bank_code: 'TB001',
          account_number: '1234567890',
          account_holder_name: 'Test User',
          country_code: 'CI',
        })
        .expect(201);
    });

    it('should return 400 for missing bankCode', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts')
        .send({ accountNumber: '1234567890' })
        .expect(400);
    });
  });

  describe('POST /api/v1/bank-accounts/:id/verify', () => {
    it('should verify bank account (200)', async () => {
      mockBankLinkingService.verifyBankAccount.mockResolvedValue(
        TestData.bankAccount({ status: 'verified' }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/verify',
        )
        .send({ otp: '123456' })
        .expect(201);
    });
  });

  describe('POST /api/v1/bank-accounts/:id/deposit', () => {
    it('should deposit from bank (200)', async () => {
      mockBankLinkingService.deposit.mockResolvedValue({
        success: true,
        transactionId: 'tx_123',
      });
      await request(app.getHttpServer())
        .post(
          '/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/deposit',
        )
        .send({ amount: 500 })
        .expect(201);
    });
  });

  describe('POST /api/v1/bank-accounts/:id/withdraw', () => {
    it('should withdraw to bank (200)', async () => {
      mockBankLinkingService.withdraw.mockResolvedValue({
        success: true,
        transactionId: 'tx_124',
      });
      await request(app.getHttpServer())
        .post(
          '/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/withdraw',
        )
        .send({ amount: 200 })
        .expect(201);
    });
  });

  describe('DELETE /api/v1/bank-accounts/:id', () => {
    it('should unlink bank account (200)', async () => {
      mockBankLinkingService.unlinkAccount.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
