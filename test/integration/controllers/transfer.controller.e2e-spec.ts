/**
 * Transfer Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockTransferRepo = {
  findByUserId: jest.fn(),
  countByUserId: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
};
const mockInternalTransfer = { execute: jest.fn() };
const mockExternalTransfer = { execute: jest.fn() };

import { TransferController } from '@modules/transfer/application/controllers/transfer.controller';
import { TransferRepository } from '@modules/transfer/infrastructure/repositories/transfer.repository';
import { InternalTransferUseCase } from '@modules/wallet/application/usecases/internal-transfer.use-case';
import { ExternalTransferUseCase } from '@modules/wallet/application/usecases/external-transfer.use-case';

function transferEntity(overrides: Record<string, any> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    reference: 'INT-550E8400',
    type: 'internal',
    status: 'completed',
    senderId: TEST_USER.id,
    senderWalletId: TEST_USER.walletId,
    senderPhone: TEST_USER.phone,
    recipientId: '550e8400-e29b-41d4-a716-446655440001',
    recipientWalletId: '660e8400-e29b-41d4-a716-446655440001',
    recipientPhone: '+2250701234568',
    amount: 5000,
    fee: 0,
    totalAmount: 5000,
    currency: 'USDC',
    note: null,
    providerTransferId: null,
    providerName: null,
    txHash: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
}

describe('TransferController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [TransferController],
      providers: [
        { provide: TransferRepository, useValue: mockTransferRepo },
        { provide: InternalTransferUseCase, useValue: mockInternalTransfer },
        { provide: ExternalTransferUseCase, useValue: mockExternalTransfer },
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

  describe('POST /api/v1/transfers/internal', () => {
    it('should create internal transfer (200)', async () => {
      mockInternalTransfer.execute.mockResolvedValue({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        fromWalletId: TEST_USER.walletId,
        toWalletId: '660e8400-e29b-41d4-a716-446655440001',
        toPhone: '+2250701234568',
        amount: 50.25,
        fee: 0,
        currency: 'USDC',
        status: 'completed',
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/transfers/internal')
        .send({
          recipientPhone: '+2250701234568',
          amount: 50.25,
          currency: 'USDC',
          note: 'Payment for lunch',
        })
        .expect(200);

      expect(mockInternalTransfer.execute).toHaveBeenCalledWith({
        fromUserId: TEST_USER.id,
        toPhone: '+2250701234568',
        amount: 50.25,
        currency: 'USDC',
        note: 'Payment for lunch',
      });
      expect(res.body).toMatchObject({
        recipientPhone: '+2250701234568',
        amount: 50.25,
        fee: 0,
        totalAmount: 50.25,
        currency: 'USDC',
        note: 'Payment for lunch',
      });
    });

    it('should allow minimum decimal USDC transfer amount (200)', async () => {
      mockInternalTransfer.execute.mockResolvedValue({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        fromWalletId: TEST_USER.walletId,
        toWalletId: '660e8400-e29b-41d4-a716-446655440001',
        toPhone: '+2250701234568',
        amount: 0.01,
        fee: 0,
        currency: 'USDC',
        status: 'completed',
      });

      await request(app.getHttpServer())
        .post('/api/v1/transfers/internal')
        .send({
          recipientPhone: '+2250701234568',
          amount: 0.01,
          currency: 'USDC',
        })
        .expect(200);

      expect(mockInternalTransfer.execute).toHaveBeenCalledWith({
        fromUserId: TEST_USER.id,
        toPhone: '+2250701234568',
        amount: 0.01,
        currency: 'USDC',
        note: undefined,
      });
    });

    it('should return 400 for missing amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transfers/internal')
        .send({ recipientPhone: '+2250701234568' })
        .expect(400);
    });
  });

  describe('POST /api/v1/transfers/external', () => {
    it('should create external transfer (200)', async () => {
      mockExternalTransfer.execute.mockResolvedValue({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: TEST_USER.walletId,
        toAddress: '0x' + 'a'.repeat(40),
        amount: 5000,
        fee: 100,
        currency: 'USDC',
        status: 'processing',
      });
      await request(app.getHttpServer())
        .post('/api/v1/transfers/external')
        .send({
          recipientAddress: '0x' + 'a'.repeat(40),
          amount: 5000,
          currency: 'USDC',
        })
        .expect(200);
    });
  });

  describe('GET /api/v1/transfers', () => {
    it('should list transfers (200)', async () => {
      mockTransferRepo.findByUserId.mockResolvedValue([transferEntity()]);
      mockTransferRepo.countByUserId.mockResolvedValue(1);
      await request(app.getHttpServer()).get('/api/v1/transfers').expect(200);
    });
  });

  describe('GET /api/v1/transfers/:id', () => {
    it('should get transfer by id (200)', async () => {
      mockTransferRepo.findById.mockResolvedValue(transferEntity());
      await request(app.getHttpServer())
        .get('/api/v1/transfers/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
