/**
 * Transaction Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockGetTransactions = { execute: jest.fn() };
const mockGetTransaction = { execute: jest.fn() };
const mockGetDepositStatus = { execute: jest.fn() };

import { TransactionController } from '@modules/transaction/application/controllers/transaction.controller';
import { GetTransactionsUseCase } from '@modules/transaction/application/usecases/get-transactions.use-case';
import { GetTransactionUseCase } from '@modules/transaction/application/usecases/get-transaction.use-case';
import { GetDepositStatusUseCase } from '@modules/transaction/application/usecases';

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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/wallet/transactions', () => {
    it('should return transactions (200)', async () => {
      mockGetTransactions.execute.mockResolvedValue({
        transactions: [TestData.transaction()],
        total: 1,
        page: 1,
        limit: 20,
      });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/transactions/:id', () => {
    it('should return single transaction (200)', async () => {
      mockGetTransaction.execute.mockResolvedValue(TestData.transaction());
      await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/transactions/stats', () => {
    it('should return transaction stats (200)', async () => {
      mockGetTransactions.execute.mockResolvedValue({
        totalSent: 500,
        totalReceived: 300,
        totalDeposited: 1000,
      });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions/stats')
        .expect(200);
    });
  });
});
