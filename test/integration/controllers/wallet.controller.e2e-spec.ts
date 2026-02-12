/**
 * Wallet Controller Integration Tests
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockGetBalance = { execute: jest.fn() };
const mockGetDepositChannels = { execute: jest.fn() };
const mockInitiateDeposit = { execute: jest.fn() };
const mockInternalTransfer = { execute: jest.fn() };
const mockExternalTransfer = { execute: jest.fn() };
const mockGetRate = { execute: jest.fn() };
const mockSubmitKyc = { execute: jest.fn() };
const mockGetKycStatus = { execute: jest.fn() };
const mockVerifyPin = { execute: jest.fn() };
const mockSetPin = { execute: jest.fn() };
const mockCreateWallet = { execute: jest.fn() };
const mockGetWalletLimits = { execute: jest.fn() };
const mockGetDepositStatus = { execute: jest.fn() };

import { WalletController } from '@modules/wallet/application/controllers/wallet.controller';
import {
  GetBalanceUseCase,
  GetDepositChannelsUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
  GetRateUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
  VerifyPinUseCase,
  SetPinUseCase,
  CreateWalletUseCase,
  GetWalletLimitsUseCase,
} from '@modules/wallet/application/usecases';
import { GetDepositStatusUseCase } from '@modules/transaction/application/usecases';

describe('WalletController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [WalletController],
      providers: [
        { provide: GetBalanceUseCase, useValue: mockGetBalance },
        { provide: GetDepositChannelsUseCase, useValue: mockGetDepositChannels },
        { provide: InitiateDepositUseCase, useValue: mockInitiateDeposit },
        { provide: InternalTransferUseCase, useValue: mockInternalTransfer },
        { provide: ExternalTransferUseCase, useValue: mockExternalTransfer },
        { provide: GetRateUseCase, useValue: mockGetRate },
        { provide: SubmitKycUseCase, useValue: mockSubmitKyc },
        { provide: GetKycStatusUseCase, useValue: mockGetKycStatus },
        { provide: VerifyPinUseCase, useValue: mockVerifyPin },
        { provide: SetPinUseCase, useValue: mockSetPin },
        { provide: CreateWalletUseCase, useValue: mockCreateWallet },
        { provide: GetWalletLimitsUseCase, useValue: mockGetWalletLimits },
        { provide: GetDepositStatusUseCase, useValue: mockGetDepositStatus },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/wallet', () => {
    it('should return wallet balance (200)', async () => {
      mockGetBalance.execute.mockResolvedValue(TestData.wallet());
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .expect(200);
      expect(mockGetBalance.execute).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/wallet/create', () => {
    it('should create wallet (201)', async () => {
      mockCreateWallet.execute.mockResolvedValue(TestData.wallet());
      await request(app.getHttpServer())
        .post('/api/v1/wallet/create')
        .expect(201);
    });
  });

  describe('GET /api/v1/wallet/deposit/channels', () => {
    it('should return deposit channels (200)', async () => {
      mockGetDepositChannels.execute.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/wallet/deposit/channels')
        .expect(200);
    });
  });

  describe('POST /api/v1/wallet/deposit', () => {
    it('should initiate deposit (201)', async () => {
      mockInitiateDeposit.execute.mockResolvedValue(TestData.deposit());
      await request(app.getHttpServer())
        .post('/api/v1/wallet/deposit')
        .send({ amount: 100, sourceCurrency: 'XOF', channelId: 'mtn_momo' })
        .expect(201);
    });

    it('should return 400 for missing amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/deposit')
        .send({ sourceCurrency: 'XOF' })
        .expect(400);
    });
  });

  describe('GET /api/v1/wallet/deposit/:id', () => {
    it('should return deposit status (200)', async () => {
      mockGetDepositStatus.execute.mockResolvedValue(TestData.deposit({ status: 'completed' }));
      await request(app.getHttpServer())
        .get('/api/v1/wallet/deposit/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/wallet/transfer/internal', () => {
    it('should transfer internally (200)', async () => {
      mockInternalTransfer.execute.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/internal')
        .send({ recipientPhone: '+2250701234568', amount: 50, currency: 'USDC' })
        .expect(200);
    });

    it('should return 400 for missing recipientPhone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/internal')
        .send({ amount: 50 })
        .expect(400);
    });
  });

  describe('POST /api/v1/wallet/transfer/external', () => {
    it('should transfer externally (200)', async () => {
      mockExternalTransfer.execute.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/external')
        .send({ toAddress: '0x' + 'a'.repeat(40), amount: 50, currency: 'USDC' })
        .expect(200);
    });
  });

  describe('POST /api/v1/wallet/withdraw', () => {
    it('should withdraw (200)', async () => {
      mockExternalTransfer.execute.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .post('/api/v1/wallet/withdraw')
        .send({ toAddress: '0x' + 'a'.repeat(40), amount: 50, currency: 'USDC' })
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/rate', () => {
    it('should return exchange rate (200)', async () => {
      mockGetRate.execute.mockResolvedValue({ rate: 0.0016, sourceCurrency: 'XOF', targetCurrency: 'USDC' });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/rate')
        .query({ sourceCurrency: 'XOF', targetCurrency: 'USDC', amount: 100 })
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/kyc/status', () => {
    it('should return KYC status (200)', async () => {
      mockGetKycStatus.execute.mockResolvedValue({ status: 'verified' });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/kyc/status')
        .expect(200);
    });
  });

  describe('POST /api/v1/wallet/pin/verify', () => {
    it('should verify PIN (200)', async () => {
      mockVerifyPin.execute.mockResolvedValue({ success: true, pinToken: 'tok' });
      await request(app.getHttpServer())
        .post('/api/v1/wallet/pin/verify')
        .send({ pin: '1234' })
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/limits', () => {
    it('should return wallet limits (200)', async () => {
      mockGetWalletLimits.execute.mockResolvedValue({ daily: 5000, monthly: 50000 });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/limits')
        .expect(200);
    });
  });
});
