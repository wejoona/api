/**
 * Recurring Transfer Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockRecurringService = {
  getRecurringTransfers: jest.fn(),
  getUpcomingExecutions: jest.fn(),
  getRecurringTransfer: jest.fn(),
  createRecurringTransfer: jest.fn(),
  updateRecurringTransfer: jest.fn(),
  pauseRecurringTransfer: jest.fn(),
  resumeRecurringTransfer: jest.fn(),
  cancelRecurringTransfer: jest.fn(),
};

import { RecurringTransferController } from '@modules/recurring-transfers/application/controllers/recurring-transfer.controller';
import { RecurringTransferService } from '@modules/recurring-transfers/application/services/recurring-transfer.service';

describe('RecurringTransferController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [RecurringTransferController],
      providers: [
        { provide: RecurringTransferService, useValue: mockRecurringService },
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

  describe('GET /api/v1/recurring-transfers', () => {
    it('should list recurring transfers with data alias (200)', async () => {
      mockRecurringService.getRecurringTransfers.mockResolvedValue([
        TestData.recurringTransfer(),
      ]);
      const response = await request(app.getHttpServer())
        .get('/api/v1/recurring-transfers')
        .expect(200);

      expect(response.body.transfers).toHaveLength(1);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return a mobile-safe empty recurring transfer list (200)', async () => {
      mockRecurringService.getRecurringTransfers.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/recurring-transfers')
        .expect(200);

      expect(response.body).toEqual({ transfers: [], data: [] });
    });
  });

  describe('GET /api/v1/recurring-transfers/upcoming', () => {
    it('should list upcoming with data alias (200)', async () => {
      mockRecurringService.getUpcomingExecutions.mockResolvedValue([
        TestData.recurringTransfer(),
      ]);
      const response = await request(app.getHttpServer())
        .get('/api/v1/recurring-transfers/upcoming')
        .expect(200);

      expect(response.body.upcoming).toHaveLength(1);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/recurring-transfers/:id', () => {
    it('should get by id (200)', async () => {
      mockRecurringService.getRecurringTransfer.mockResolvedValue(
        TestData.recurringTransfer(),
      );
      await request(app.getHttpServer())
        .get('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers', () => {
    it('should create (201)', async () => {
      mockRecurringService.createRecurringTransfer.mockResolvedValue(
        TestData.recurringTransfer(),
      );
      await request(app.getHttpServer())
        .post('/api/v1/recurring-transfers')
        .send({
          recipientPhone: '+2250701234568',
          recipientName: 'John Doe',
          amount: 50,
          frequency: 'weekly',
          startDate: '2026-03-01',
        })
        .expect(201);
    });
  });

  describe('PATCH /api/v1/recurring-transfers/:id', () => {
    it('should update (200)', async () => {
      mockRecurringService.updateRecurringTransfer.mockResolvedValue(
        TestData.recurringTransfer({ amount: 100 }),
      );
      await request(app.getHttpServer())
        .patch(
          '/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000',
        )
        .send({ amount: 100 })
        .expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers/:id/pause', () => {
    it('should pause (200)', async () => {
      mockRecurringService.pauseRecurringTransfer.mockResolvedValue(
        TestData.recurringTransfer({ status: 'paused' }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000/pause',
        )
        .expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers/:id/resume', () => {
    it('should resume (200)', async () => {
      mockRecurringService.resumeRecurringTransfer.mockResolvedValue(
        TestData.recurringTransfer({ status: 'active' }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000/resume',
        )
        .expect(200);
    });
  });

  describe('DELETE /api/v1/recurring-transfers/:id', () => {
    it('should delete (200)', async () => {
      mockRecurringService.cancelRecurringTransfer.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete(
          '/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000',
        )
        .expect(200);
    });
  });
});
