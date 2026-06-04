/**
 * Transaction Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockGetTransactions = { execute: jest.fn() };
const mockGetTransaction = { execute: jest.fn() };
const mockGetDepositStatus = { execute: jest.fn() };

import { TransactionController } from '@modules/transaction/application/controllers/transaction.controller';
import { GetTransactionsUseCase } from '@modules/transaction/application/usecases/get-transactions.use-case';
import { GetTransactionUseCase } from '@modules/transaction/application/usecases/get-transaction.use-case';
import { GetDepositStatusUseCase } from '@modules/transaction/application/usecases';
import { TEST_USER } from '../setup/test-app';

const transactionResponse = TestData.transaction({
  id: '770e8400-e29b-41d4-a716-446655440000',
  type: 'deposit',
  amount: 16.45,
  currency: 'USDC',
  status: 'completed',
  completedAt: '2026-06-04T12:05:00.000Z',
  metadata: {
    sourceCurrency: 'XOF',
    sourceAmount: 10000,
    rate: 0.00166,
    fee: 150,
    provider: 'mtn',
  },
  yellowCardRef: 'yc_dep_123',
});

const depositStatusResponse = {
  transactionId: '770e8400-e29b-41d4-a716-446655440000',
  depositId: 'dep_mobile_123',
  status: 'completed',
  amount: 16.45,
  sourceCurrency: 'XOF',
  targetCurrency: 'USDC',
  rate: 0.00166,
  fee: 150,
  createdAt: '2026-06-04T12:00:00.000Z',
  completedAt: '2026-06-04T12:05:00.000Z',
};

describe('TransactionController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [TransactionController],
      providers: [
        { provide: GetTransactionsUseCase, useValue: mockGetTransactions },
        { provide: GetTransactionUseCase, useValue: mockGetTransaction },
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

  describe('GET /api/v1/wallet/transactions', () => {
    it('should return transactions (200)', async () => {
      mockGetTransactions.execute.mockResolvedValue({
        transactions: [transactionResponse],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
        .query({
          type: 'deposit',
          status: 'completed',
          limit: 20,
          offset: 0,
        })
        .expect(200);

      expect(mockGetTransactions.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        type: 'deposit',
        status: 'completed',
        startDate: undefined,
        endDate: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        limit: 20,
        offset: 0,
      });
      expect(res.body).toEqual({
        transactions: [transactionResponse],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });
  });

  describe('GET /api/v1/wallet/transactions/:id', () => {
    it('should return single transaction (200)', async () => {
      mockGetTransaction.execute.mockResolvedValue(transactionResponse);
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions/770e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(mockGetTransaction.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        transactionId: '770e8400-e29b-41d4-a716-446655440000',
      });
      expect(res.body).toEqual(transactionResponse);
      expect(res.body.metadata).toEqual(
        expect.objectContaining({
          sourceCurrency: 'XOF',
          sourceAmount: 10000,
          provider: 'mtn',
        }),
      );
    });
  });

  describe('GET /api/v1/wallet/transactions/stats', () => {
    it('should return transaction stats (200)', async () => {
      mockGetTransactions.execute.mockResolvedValue({
        totalSent: 500,
        totalReceived: 300,
        totalDeposited: 1000,
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions/stats')
        .expect(200);

      expect(res.body).toEqual({
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalTransfers: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalTransferred: 0,
        currency: 'USDC',
        firstTransactionAt: null,
        lastTransactionAt: null,
      });
    });
  });

  describe('GET /api/v1/wallet/transactions/deposit/:id/status', () => {
    it('should return deposit status before generic transaction route catches it', async () => {
      mockGetDepositStatus.execute.mockResolvedValue(depositStatusResponse);

      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/wallet/transactions/deposit/770e8400-e29b-41d4-a716-446655440000/status',
        )
        .expect(200);

      expect(mockGetDepositStatus.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        transactionId: '770e8400-e29b-41d4-a716-446655440000',
      });
      expect(mockGetTransaction.execute).not.toHaveBeenCalled();
      expect(res.body).toEqual(depositStatusResponse);
    });
  });
});
