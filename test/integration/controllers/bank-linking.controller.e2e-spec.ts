/**
 * Bank Linking Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockBankLinkingService = {
  getBanks: jest.fn(),
  getLinkedAccounts: jest.fn(),
  getLinkedAccount: jest.fn(),
  linkAccount: jest.fn(),
  verifyAccount: jest.fn(),
  depositFromBank: jest.fn(),
  withdrawToBank: jest.fn(),
  unlinkAccount: jest.fn(),
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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/banks', () => {
    it('should list banks (200)', async () => {
      mockBankLinkingService.getBanks.mockResolvedValue([
        { id: 'tb001', name: 'Test Bank', country: 'CI' },
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/banks')
        .expect(200);
    });
  });

  describe('GET /api/v1/bank-accounts', () => {
    it('should list linked accounts (200)', async () => {
      mockBankLinkingService.getLinkedAccounts.mockResolvedValue([TestData.bankAccount()]);
      await request(app.getHttpServer())
        .get('/api/v1/bank-accounts')
        .expect(200);
    });
  });

  describe('POST /api/v1/bank-accounts', () => {
    it('should link bank account (201)', async () => {
      mockBankLinkingService.linkAccount.mockResolvedValue(TestData.bankAccount());
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts')
        .send({ bankCode: 'TB001', accountNumber: '1234567890', accountName: 'Test User' })
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
      mockBankLinkingService.verifyAccount.mockResolvedValue(TestData.bankAccount({ status: 'verified' }));
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/verify')
        .send({ otp: '123456' })
        .expect(200);
    });
  });

  describe('POST /api/v1/bank-accounts/:id/deposit', () => {
    it('should deposit from bank (200)', async () => {
      mockBankLinkingService.depositFromBank.mockResolvedValue({ success: true, transactionId: 'tx_123' });
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/deposit')
        .send({ amount: 500 })
        .expect(200);
    });
  });

  describe('POST /api/v1/bank-accounts/:id/withdraw', () => {
    it('should withdraw to bank (200)', async () => {
      mockBankLinkingService.withdrawToBank.mockResolvedValue({ success: true, transactionId: 'tx_124' });
      await request(app.getHttpServer())
        .post('/api/v1/bank-accounts/550e8400-e29b-41d4-a716-446655440000/withdraw')
        .send({ amount: 200 })
        .expect(200);
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
