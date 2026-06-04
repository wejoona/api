/**
 * Withdrawal Controller Integration Tests
 *
 * Covers active mobile withdrawal routes.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockWithdrawalService = {
  initiateWithdrawal: jest.fn(),
  getWithdrawal: jest.fn(),
  listWithdrawals: jest.fn(),
};

import { WithdrawalController } from '@modules/withdrawal/application/controllers/withdrawal.controller';
import { WithdrawalService } from '@modules/withdrawal/application/services/withdrawal.service';
import { WithdrawalStatus } from '@modules/withdrawal/domain/enums/withdrawal-status.enum';

describe('WithdrawalController (e2e)', () => {
  let app: INestApplication;

  const withdrawalResponse = {
    id: 'wdr_123',
    status: WithdrawalStatus.INITIATED,
    amount: 1000,
    fiatAmount: 600000,
    currency: 'XOF',
    providerCode: 'OMCI',
    phoneNumber: '+2250700000001',
    exchangeRate: 600,
    providerReference: 'provider_wdr_123',
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [WithdrawalController],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
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

  describe('POST /api/v1/withdrawals/initiate', () => {
    it('should initiate a mobile money withdrawal (201)', async () => {
      mockWithdrawalService.initiateWithdrawal.mockResolvedValue(
        withdrawalResponse,
      );

      const body = {
        amount: 1000,
        currency: 'XOF',
        providerCode: 'OMCI',
        phoneNumber: '+2250700000001',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/withdrawals/initiate')
        .set('X-Idempotency-Key', 'withdrawal-e2e-key')
        .set('X-Pin-Token', 'pin-token')
        .send(body)
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'wdr_123',
        status: WithdrawalStatus.INITIATED,
        amount: 1000,
        fiatAmount: 600000,
        currency: 'XOF',
        providerCode: 'OMCI',
        phoneNumber: '+2250700000001',
      });
      expect(mockWithdrawalService.initiateWithdrawal).toHaveBeenCalledWith(
        TEST_USER.id,
        body,
      );
    });

    it('should reject invalid mobile withdrawal payloads', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/withdrawals/initiate')
        .send({ amount: 99, currency: 'USD' })
        .expect(400);
    });
  });

  describe('GET /api/v1/withdrawals/:id', () => {
    it('should return withdrawal status (200)', async () => {
      mockWithdrawalService.getWithdrawal.mockResolvedValue(withdrawalResponse);

      await request(app.getHttpServer())
        .get('/api/v1/withdrawals/wdr_123')
        .expect(200);

      expect(mockWithdrawalService.getWithdrawal).toHaveBeenCalledWith(
        'wdr_123',
        TEST_USER.id,
      );
    });
  });

  describe('GET /api/v1/withdrawals', () => {
    it('should list withdrawals with safe pagination (200)', async () => {
      mockWithdrawalService.listWithdrawals.mockResolvedValue({
        withdrawals: [withdrawalResponse],
        total: 1,
        hasMore: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/withdrawals?limit=10&offset=0')
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, hasMore: false });
      expect(mockWithdrawalService.listWithdrawals).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        status: undefined,
        limit: 10,
        offset: 0,
      });
    });
  });
});
