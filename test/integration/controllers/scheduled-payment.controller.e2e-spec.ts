/**
 * Scheduled Payment Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockScheduledPaymentService = {
  createSchedule: jest.fn(),
  getUserSchedules: jest.fn(),
  getSchedule: jest.fn(),
  cancelSchedule: jest.fn(),
};

import { ScheduledPaymentController } from '@modules/scheduled-payments/application/controllers/scheduled-payment.controller';
import { ScheduledPaymentService } from '@modules/scheduled-payments/application/services/scheduled-payment.service';

describe('ScheduledPaymentController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ScheduledPaymentController],
      providers: [
        {
          provide: ScheduledPaymentService,
          useValue: mockScheduledPaymentService,
        },
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

  describe('POST /api/v1/scheduled-payments', () => {
    it('should create scheduled payment (201)', async () => {
      mockScheduledPaymentService.createSchedule.mockResolvedValue({
        id: 'sp_123',
        status: 'scheduled',
      });
      await request(app.getHttpServer())
        .post('/api/v1/scheduled-payments')
        .send({
          recipientId: 'user_123',
          recipientType: 'internal',
          recipientName: 'Test User',
          amount: 100,
          name: 'Weekly transfer',
          currency: 'XOF',
          frequency: 'weekly',
          time: '09:00',
          timezone: 'Africa/Abidjan',
          startDate: '2026-03-01',
        })
        .expect(201);
    });
  });

  describe('GET /api/v1/scheduled-payments', () => {
    it('should list scheduled payments (200)', async () => {
      mockScheduledPaymentService.getUserSchedules.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/scheduled-payments')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/scheduled-payments/:id', () => {
    it('should cancel scheduled payment (200)', async () => {
      mockScheduledPaymentService.cancelSchedule.mockResolvedValue({
        id: 'sp_123',
        status: 'cancelled',
      });
      await request(app.getHttpServer())
        .delete('/api/v1/scheduled-payments/sp_123')
        .expect(200);
    });
  });
});
