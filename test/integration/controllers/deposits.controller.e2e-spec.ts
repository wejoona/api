/**
 * Deposits Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockDepositService = {
  getProviders: jest.fn(),
  initiate: jest.fn(),
  confirm: jest.fn(),
  getStatus: jest.fn(),
  listDeposits: jest.fn(),
};

import { DepositsController } from '@modules/deposits/application/controllers/deposits.controller';
import { DepositService } from '@modules/deposits/application/domain/services/deposit.service';

describe('DepositsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DepositsController],
      providers: [
        { provide: DepositService, useValue: mockDepositService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/deposits/providers', () => {
    it('should return providers (200)', async () => {
      mockDepositService.getProviders.mockResolvedValue([
        { id: 'mtn', name: 'MTN Mobile Money', currencies: ['XOF'] },
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/deposits/providers')
        .expect(200);
    });
  });

  describe('POST /api/v1/deposits/initiate', () => {
    it('should initiate deposit (201)', async () => {
      mockDepositService.initiate.mockResolvedValue(TestData.deposit());
      await request(app.getHttpServer())
        .post('/api/v1/deposits/initiate')
        .send({ amount: 100, providerId: 'mtn', sourceCurrency: 'XOF' })
        .expect(201);
    });

    it('should return 400 for missing amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/deposits/initiate')
        .send({ providerId: 'mtn' })
        .expect(400);
    });
  });

  describe('POST /api/v1/deposits/confirm', () => {
    it('should confirm deposit (200)', async () => {
      mockDepositService.confirm.mockResolvedValue(TestData.deposit({ status: 'confirmed' }));
      await request(app.getHttpServer())
        .post('/api/v1/deposits/confirm')
        .send({ depositId: '550e8400-e29b-41d4-a716-446655440000', otp: '123456' })
        .expect(200);
    });
  });

  describe('GET /api/v1/deposits/:id', () => {
    it('should return deposit status (200)', async () => {
      mockDepositService.getStatus.mockResolvedValue(TestData.deposit());
      await request(app.getHttpServer())
        .get('/api/v1/deposits/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
