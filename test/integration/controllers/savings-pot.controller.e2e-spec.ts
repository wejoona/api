/**
 * Savings Pot Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockCreatePot = { execute: jest.fn() };
const mockGetPots = {
  execute: jest.fn(),
  executeActive: jest.fn(),
  executeOne: jest.fn(),
};
const mockUpdatePot = { execute: jest.fn() };
const mockDepositToPot = { execute: jest.fn() };
const mockWithdrawFromPot = { execute: jest.fn(), executeAll: jest.fn() };
const mockCancelPot = { execute: jest.fn() };

import { SavingsPotController } from '@modules/savings-pots/application/controllers/savings-pot.controller';
import {
  CreateSavingsPotUseCase,
  GetSavingsPotsUseCase,
  UpdateSavingsPotUseCase,
  DepositToSavingsPotUseCase,
  WithdrawFromSavingsPotUseCase,
  CancelSavingsPotUseCase,
} from '@modules/savings-pots/application/usecases';

describe('SavingsPotController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SavingsPotController],
      providers: [
        { provide: CreateSavingsPotUseCase, useValue: mockCreatePot },
        { provide: GetSavingsPotsUseCase, useValue: mockGetPots },
        { provide: UpdateSavingsPotUseCase, useValue: mockUpdatePot },
        { provide: DepositToSavingsPotUseCase, useValue: mockDepositToPot },
        {
          provide: WithdrawFromSavingsPotUseCase,
          useValue: mockWithdrawFromPot,
        },
        { provide: CancelSavingsPotUseCase, useValue: mockCancelPot },
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

  describe('POST /api/v1/savings-pots', () => {
    it('should create savings pot (201)', async () => {
      mockCreatePot.execute.mockResolvedValue(TestData.savingsPot());
      await request(app.getHttpServer())
        .post('/api/v1/savings-pots')
        .send({ name: 'Vacation Fund', targetAmount: 500 })
        .expect(201);
    });

    it('should return 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/savings-pots')
        .send({ targetAmount: 500 })
        .expect(400);
    });
  });

  describe('GET /api/v1/savings-pots', () => {
    it('should list savings pots (200)', async () => {
      mockGetPots.execute.mockResolvedValue([TestData.savingsPot()]);
      await request(app.getHttpServer())
        .get('/api/v1/savings-pots')
        .expect(200);
    });
  });

  describe('GET /api/v1/savings-pots/active', () => {
    it('should list active savings pots (200)', async () => {
      mockGetPots.executeActive.mockResolvedValue([TestData.savingsPot()]);
      await request(app.getHttpServer())
        .get('/api/v1/savings-pots/active')
        .expect(200);
    });
  });

  describe('GET /api/v1/savings-pots/:id', () => {
    it('should get savings pot (200)', async () => {
      mockGetPots.executeOne.mockResolvedValue(TestData.savingsPot());
      await request(app.getHttpServer())
        .get('/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('PUT /api/v1/savings-pots/:id', () => {
    it('should update savings pot (200)', async () => {
      mockUpdatePot.execute.mockResolvedValue(
        TestData.savingsPot({ name: 'Updated' }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  describe('POST /api/v1/savings-pots/:id/deposit', () => {
    it('should deposit to savings pot (200)', async () => {
      mockDepositToPot.execute.mockResolvedValue(
        TestData.savingsPot({ currentAmount: 200 }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000/deposit',
        )
        .send({ amount: 100 })
        .expect(200);
    });
  });

  describe('POST /api/v1/savings-pots/:id/withdraw', () => {
    it('should withdraw from savings pot (200)', async () => {
      mockWithdrawFromPot.execute.mockResolvedValue(
        TestData.savingsPot({ currentAmount: 0 }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000/withdraw',
        )
        .send({ amount: 100 })
        .expect(200);
    });
  });

  describe('POST /api/v1/savings-pots/:id/withdraw-all', () => {
    it('should withdraw all from savings pot (200)', async () => {
      mockWithdrawFromPot.executeAll.mockResolvedValue(
        TestData.savingsPot({ currentAmount: 0 }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000/withdraw-all',
        )
        .expect(200);
    });
  });

  describe('DELETE /api/v1/savings-pots/:id', () => {
    it('should cancel savings pot (200)', async () => {
      mockCancelPot.execute.mockResolvedValue(
        TestData.savingsPot({ status: 'cancelled' }),
      );
      await request(app.getHttpServer())
        .delete('/api/v1/savings-pots/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
