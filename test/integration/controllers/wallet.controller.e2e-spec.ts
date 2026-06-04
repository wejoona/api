/**
 * Wallet Controller Integration Tests
 */

import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';
import { AppException } from '@/common/exceptions';
import { ERROR_CODES } from '@/common/constants/error-codes';

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

const walletResponse = {
  walletId: '660e8400-e29b-41d4-a716-446655440000',
  currency: 'USDC',
  source: 'ledger',
  sourceOfTruth: 'blnk',
  readStatus: 'fresh',
  isStale: false,
  degraded: false,
  warning: null,
  balances: [
    {
      currency: 'USDC',
      available: 1000,
      availableDecimal: '1000.000000',
      pending: 25,
      pendingDecimal: '25.000000',
      total: 1025,
      totalDecimal: '1025.000000',
    },
  ],
};

const depositResponse = {
  transactionId: '770e8400-e29b-41d4-a716-446655440000',
  depositId: 'dep_mobile_123',
  amount: 1000,
  amountDecimal: '1000',
  sourceCurrency: 'XOF',
  targetCurrency: 'USDC',
  rate: 0.00166,
  rateDecimal: '0.00166000',
  fee: 15,
  feeDecimal: '15',
  estimatedAmount: 1.64,
  estimatedAmountDecimal: '1.64',
  paymentInstructions: {
    type: 'mobile_money',
    provider: 'mtn',
    accountNumber: '+2250700000000',
    reference: 'DEP-MOBILE-123',
    instructions: 'Send 1000 XOF using the displayed reference.',
  },
  expiresAt: '2026-06-04T13:00:00.000Z',
};

const transferResponse = {
  transactionId: '880e8400-e29b-41d4-a716-446655440000',
  fromWalletId: '660e8400-e29b-41d4-a716-446655440000',
  toWalletId: '660e8400-e29b-41d4-a716-446655440001',
  toPhone: '+2250701234568',
  amount: 50,
  amountDecimal: '50.000000',
  currency: 'USDC',
  status: 'completed',
  fee: 0,
  feeDecimal: '0.000000',
  supportReference: '880e8400-e29b-41d4-a716-446655440000',
  ledgerReference: 'ledger-ref-internal-123',
  ledgerTransactionId: 'blnk-internal-123',
  createdAt: '2026-06-04T12:00:00.000Z',
};

const externalTransferUseCaseResponse = {
  transactionId: '990e8400-e29b-41d4-a716-446655440000',
  walletId: '660e8400-e29b-41d4-a716-446655440000',
  toAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  amount: 50,
  amountDecimal: '50.000000',
  currency: 'USDC',
  status: 'pending',
  fee: 0.01,
  feeDecimal: '0.010000',
  txHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  estimatedArrival: '1-2 minutes',
  supportReference: '990e8400-e29b-41d4-a716-446655440000',
  ledgerReference: 'ledger-ref-external-123',
  ledgerTransactionId: 'blnk-external-123',
  providerReference: 'provider-external-123',
};

describe('WalletController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [WalletController],
      providers: [
        { provide: GetBalanceUseCase, useValue: mockGetBalance },
        {
          provide: GetDepositChannelsUseCase,
          useValue: mockGetDepositChannels,
        },
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

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/wallet', () => {
    it('should return wallet balance (200)', async () => {
      mockGetBalance.execute.mockResolvedValue(walletResponse);
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .expect(200);

      expect(mockGetBalance.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
      });
      expect(res.body).toEqual(walletResponse);
      expect(res.body.balances[0]).toEqual(
        expect.objectContaining({
          currency: 'USDC',
          available: 1000,
          availableDecimal: '1000.000000',
          pending: 25,
          pendingDecimal: '25.000000',
          total: 1025,
          totalDecimal: '1025.000000',
        }),
      );
    });

    it('should return a mobile-safe missing wallet envelope (404)', async () => {
      mockGetBalance.execute.mockRejectedValue(
        new NotFoundException('Wallet not found'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Wallet not found',
        },
        meta: {
          path: '/api/v1/wallet',
          method: 'GET',
        },
      });
    });
  });

  describe('POST /api/v1/wallet/create', () => {
    it('should create wallet (201)', async () => {
      const wallet: Record<string, any> = TestData.wallet({
        circleWalletId: 'circle-wallet-123',
        circleWalletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });
      mockCreateWallet.execute.mockResolvedValue(wallet);

      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/create')
        .expect(201);

      expect(mockCreateWallet.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        userPhone: TEST_USER.phone,
      });
      expect(res.body).toEqual({
        id: wallet.id,
        userId: wallet.userId,
        circleWalletId: wallet.circleWalletId,
        circleWalletAddress: wallet.circleWalletAddress,
        currency: wallet.currency,
        balance: wallet.balance,
        balanceDecimal: '1000.000000',
        status: wallet.status,
      });
    });
  });

  describe('GET /api/v1/wallet/deposit/channels', () => {
    it('should return deposit channels (200)', async () => {
      mockGetDepositChannels.execute.mockResolvedValue({
        country: 'US',
        currency: 'USD',
        status: 'unavailable',
        reason: 'no_deposit_channels_available',
        retryable: false,
        supportReviewRequired: true,
        channels: [],
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/deposit/channels')
        .query({ country: 'US', currency: 'USD' })
        .expect(200);

      expect(mockGetDepositChannels.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        country: 'US',
        currency: 'USD',
      });
      expect(res.body).toMatchObject({
        country: 'US',
        currency: 'USD',
        status: 'unavailable',
        reason: 'no_deposit_channels_available',
        supportReviewRequired: true,
        channels: [],
      });
    });
  });

  describe('GET /api/v1/wallet/deposit/providers', () => {
    it('should return provider alias with capability metadata (200)', async () => {
      mockGetDepositChannels.execute.mockResolvedValue({
        country: 'CI',
        currency: 'XOF',
        status: 'available',
        reason: null,
        retryable: false,
        supportReviewRequired: false,
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
            currency: 'XOF',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/deposit/providers')
        .query({ currency: 'XOF' })
        .expect(200);

      expect(mockGetDepositChannels.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        country: TEST_USER.countryCode,
        currency: 'XOF',
      });
      expect(res.body).toMatchObject({
        country: 'CI',
        currency: 'XOF',
        status: 'available',
        reason: null,
        providers: [
          {
            id: 'orange_money_ci',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            currency: 'XOF',
          },
        ],
      });
    });
  });

  describe('GET /api/v1/wallet/withdraw/options', () => {
    it('should return withdrawal options from backend capability data (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/withdraw/options')
        .query({ country: 'US' })
        .expect(200);

      expect(res.body).toMatchObject({
        country: 'US',
        currency: 'USDC',
        status: 'available',
        reason: null,
        retryable: false,
        supportReviewRequired: false,
        options: expect.arrayContaining([
          expect.objectContaining({
            id: 'usdc_polygon',
            type: 'blockchain',
            network: 'polygon',
            enabled: true,
          }),
        ]),
      });
    });
  });

  describe('POST /api/v1/wallet/deposit', () => {
    it('should initiate deposit (201)', async () => {
      mockInitiateDeposit.execute.mockResolvedValue(depositResponse);
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/deposit')
        .send({ amount: 1000, sourceCurrency: 'XOF', channelId: 'mtn_momo' })
        .expect(201);

      expect(mockInitiateDeposit.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        amount: 1000,
        sourceCurrency: 'XOF',
        channelId: 'mtn_momo',
      });
      expect(res.body).toEqual(depositResponse);
      expect(res.body.paymentInstructions).toEqual(
        expect.objectContaining({
          type: 'mobile_money',
          provider: 'mtn',
          reference: 'DEP-MOBILE-123',
        }),
      );
    });

    it('should return 400 for missing amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/deposit')
        .send({ sourceCurrency: 'XOF' })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          details: expect.arrayContaining([expect.stringContaining('amount')]),
        },
      });
    });

    it('should return a deterministic provider-disabled envelope', async () => {
      mockInitiateDeposit.execute.mockRejectedValue(
        AppException.badRequest(
          ERROR_CODES.DEPOSIT_PROVIDER_UNAVAILABLE,
          'Payment gateway disabled (YELLOW_CARD_ENABLED=false). Cannot call initiateDeposit.',
          undefined,
          {
            reason: 'provider_or_feature_disabled',
            featureReason: 'yellow_card_disabled',
            provider: 'yellow_card',
          },
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/deposit')
        .send({ amount: 1000, sourceCurrency: 'XOF', channelId: 'mtn_momo' })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.DEPOSIT_PROVIDER_UNAVAILABLE,
          reason: 'provider_or_feature_disabled',
          featureReason: 'yellow_card_disabled',
          provider: 'yellow_card',
        },
        meta: {
          path: '/api/v1/wallet/deposit',
          method: 'POST',
        },
      });
    });
  });

  describe('GET /api/v1/wallet/deposit/:id', () => {
    it('should return deposit status (200)', async () => {
      const completedDeposit = {
        ...depositResponse,
        status: 'completed',
        completedAt: '2026-06-04T12:05:00.000Z',
      };
      mockGetDepositStatus.execute.mockResolvedValue(completedDeposit);

      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/deposit/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(mockGetDepositStatus.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(res.body).toEqual(completedDeposit);
    });
  });

  describe('POST /api/v1/wallet/transfer/internal', () => {
    it('should transfer internally (200)', async () => {
      mockInternalTransfer.execute.mockResolvedValue(transferResponse);
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/internal')
        .send({
          toPhone: '+2250701234568',
          amount: 50,
          currency: 'USDC',
        })
        .expect(200);

      expect(mockInternalTransfer.execute).toHaveBeenCalledWith({
        fromUserId: TEST_USER.id,
        toPhone: '+2250701234568',
        recipientUsername: undefined,
        amount: 50,
        currency: 'USDC',
        note: undefined,
      });
      expect(res.body).toEqual(transferResponse);
    });

    it('should return 400 for missing recipientPhone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/internal')
        .send({ amount: 50 })
        .expect(400);
    });

    it('should return a deterministic insufficient funds envelope (400)', async () => {
      mockInternalTransfer.execute.mockRejectedValue(
        AppException.badRequest(
          ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
          'Insufficient balance',
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/internal')
        .send({
          toPhone: '+2250701234568',
          amount: 5000,
          currency: 'USDC',
        })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
          message: 'Insufficient balance',
        },
        meta: {
          path: '/api/v1/wallet/transfer/internal',
          method: 'POST',
        },
      });
    });
  });

  describe('POST /api/v1/wallet/transfer/external', () => {
    it('should transfer externally (200)', async () => {
      mockExternalTransfer.execute.mockResolvedValue(
        externalTransferUseCaseResponse,
      );
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/transfer/external')
        .send({
          toAddress: '0x' + 'a'.repeat(40),
          amount: 50,
          currency: 'USDC',
          network: 'polygon',
        })
        .expect(200);

      expect(mockExternalTransfer.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        toAddress: '0x' + 'a'.repeat(40),
        amount: 50,
        currency: 'USDC',
        network: 'polygon',
      });
      expect(res.body).toEqual({
        transactionId: externalTransferUseCaseResponse.transactionId,
        id: externalTransferUseCaseResponse.transactionId,
        walletId: externalTransferUseCaseResponse.walletId,
        toAddress: externalTransferUseCaseResponse.toAddress,
        recipientAddress: externalTransferUseCaseResponse.toAddress,
        amount: externalTransferUseCaseResponse.amount,
        amountDecimal: externalTransferUseCaseResponse.amountDecimal,
        currency: externalTransferUseCaseResponse.currency,
        fee: externalTransferUseCaseResponse.fee,
        feeDecimal: externalTransferUseCaseResponse.feeDecimal,
        status: externalTransferUseCaseResponse.status,
        network: 'polygon',
        txHash: externalTransferUseCaseResponse.txHash,
        estimatedArrival: externalTransferUseCaseResponse.estimatedArrival,
        supportReference: externalTransferUseCaseResponse.supportReference,
        ledgerReference: externalTransferUseCaseResponse.ledgerReference,
        ledgerTransactionId: externalTransferUseCaseResponse.ledgerTransactionId,
        providerReference: externalTransferUseCaseResponse.providerReference,
        timestamp: expect.any(String),
        createdAt: expect.any(String),
      });
    });
  });

  describe('POST /api/v1/wallet/withdraw', () => {
    it('should withdraw (200)', async () => {
      mockExternalTransfer.execute.mockResolvedValue(
        externalTransferUseCaseResponse,
      );
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/withdraw')
        .send({
          destinationAddress: '0x' + 'a'.repeat(40),
          amount: 50,
        })
        .expect(200);

      expect(mockExternalTransfer.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        toAddress: '0x' + 'a'.repeat(40),
        amount: 50,
        currency: 'USD',
        network: 'polygon',
      });
      expect(res.body).toEqual({
        transactionId: externalTransferUseCaseResponse.transactionId,
        amount: externalTransferUseCaseResponse.amount,
        amountDecimal: externalTransferUseCaseResponse.amountDecimal,
        destinationAddress: externalTransferUseCaseResponse.toAddress,
        network: 'polygon',
        fee: externalTransferUseCaseResponse.fee,
        feeDecimal: externalTransferUseCaseResponse.feeDecimal,
        status: externalTransferUseCaseResponse.status,
        supportReference: externalTransferUseCaseResponse.supportReference,
        ledgerReference: externalTransferUseCaseResponse.ledgerReference,
        ledgerTransactionId: externalTransferUseCaseResponse.ledgerTransactionId,
        providerReference: externalTransferUseCaseResponse.providerReference,
      });
    });

    it('should return a deterministic provider-disabled envelope', async () => {
      mockExternalTransfer.execute.mockRejectedValue(
        AppException.badRequest(
          ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
          'Payment gateway disabled (YELLOW_CARD_ENABLED=false). Cannot call externalTransfer.',
          undefined,
          {
            reason: 'provider_or_feature_disabled',
            featureReason: 'yellow_card_disabled',
            provider: 'yellow_card',
          },
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/withdraw')
        .send({
          destinationAddress: '0x' + 'a'.repeat(40),
          amount: 50,
        })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
          reason: 'provider_or_feature_disabled',
          featureReason: 'yellow_card_disabled',
          provider: 'yellow_card',
        },
        meta: {
          path: '/api/v1/wallet/withdraw',
          method: 'POST',
        },
      });
    });
  });

  describe('GET /api/v1/wallet/rate', () => {
    it('should return exchange rate (200)', async () => {
      mockGetRate.execute.mockResolvedValue({
        rate: 0.0016,
        sourceCurrency: 'XOF',
        targetCurrency: 'USDC',
      });
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
      mockVerifyPin.execute.mockResolvedValue({
        success: true,
        pinToken: 'tok',
      });
      await request(app.getHttpServer())
        .post('/api/v1/wallet/pin/verify')
        .send({ pin: '1234' })
        .expect(200);
    });

    it('should return a deterministic invalid PIN envelope (400)', async () => {
      mockVerifyPin.execute.mockRejectedValue(
        AppException.badRequest(ERROR_CODES.PIN_INCORRECT, 'Invalid PIN'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/pin/verify')
        .send({ pin: '0000' })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.PIN_INCORRECT,
          message: 'Invalid PIN',
        },
        meta: {
          path: '/api/v1/wallet/pin/verify',
          method: 'POST',
        },
      });
    });

    it('should return validation details without echoing PIN or token values (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/pin/verify')
        .send({
          pin: '12ab',
          clientToken: 'tok_secret_123456',
        })
        .expect(400);

      const serialized = JSON.stringify(res.body);
      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          details: expect.arrayContaining([
            expect.stringContaining('PIN must contain only digits'),
          ]),
        },
      });
      expect(serialized).not.toContain('12ab');
      expect(serialized).not.toContain('tok_secret_123456');
    });
  });

  describe('GET /api/v1/wallet/limits', () => {
    it('should return wallet limits (200)', async () => {
      mockGetWalletLimits.execute.mockResolvedValue({
        daily: 5000,
        monthly: 50000,
      });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/limits')
        .expect(200);
    });
  });
});
