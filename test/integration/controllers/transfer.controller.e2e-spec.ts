/**
 * Transfer Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockTransferRepo = {
  findByUserId: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
};
const mockInternalTransfer = { execute: jest.fn() };
const mockExternalTransfer = { execute: jest.fn() };

import { TransferController } from '@modules/transfer/application/controllers/transfer.controller';
import { TransferRepository } from '@modules/transfer/infrastructure/repositories/transfer.repository';
import { InternalTransferUseCase } from '@modules/wallet/application/usecases/internal-transfer.use-case';
import { ExternalTransferUseCase } from '@modules/wallet/application/usecases/external-transfer.use-case';

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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/transfers/internal', () => {
    it('should create internal transfer (200)', async () => {
      mockInternalTransfer.execute.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .post('/api/v1/transfers/internal')
        .send({ recipientPhone: '+2250701234568', amount: 50, currency: 'USDC' })
        .expect(200);
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
      mockExternalTransfer.execute.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .post('/api/v1/transfers/external')
        .send({ toAddress: '0x' + 'a'.repeat(40), amount: 50, currency: 'USDC' })
        .expect(200);
    });
  });

  describe('GET /api/v1/transfers', () => {
    it('should list transfers (200)', async () => {
      mockTransferRepo.findByUserId.mockResolvedValue([TestData.transfer()]);
      await request(app.getHttpServer())
        .get('/api/v1/transfers')
        .expect(200);
    });
  });

  describe('GET /api/v1/transfers/:id', () => {
    it('should get transfer by id (200)', async () => {
      mockTransferRepo.findById.mockResolvedValue(TestData.transfer());
      await request(app.getHttpServer())
        .get('/api/v1/transfers/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
