/**
 * Recurring Transfer Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockRecurringService = {
  findAll: jest.fn(),
  findUpcoming: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  delete: jest.fn(),
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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/recurring-transfers', () => {
    it('should list recurring transfers (200)', async () => {
      mockRecurringService.findAll.mockResolvedValue([TestData.recurringTransfer()]);
      await request(app.getHttpServer()).get('/api/v1/recurring-transfers').expect(200);
    });
  });

  describe('GET /api/v1/recurring-transfers/upcoming', () => {
    it('should list upcoming (200)', async () => {
      mockRecurringService.findUpcoming.mockResolvedValue([TestData.recurringTransfer()]);
      await request(app.getHttpServer()).get('/api/v1/recurring-transfers/upcoming').expect(200);
    });
  });

  describe('GET /api/v1/recurring-transfers/:id', () => {
    it('should get by id (200)', async () => {
      mockRecurringService.findById.mockResolvedValue(TestData.recurringTransfer());
      await request(app.getHttpServer()).get('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000').expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers', () => {
    it('should create (201)', async () => {
      mockRecurringService.create.mockResolvedValue(TestData.recurringTransfer());
      await request(app.getHttpServer())
        .post('/api/v1/recurring-transfers')
        .send({ recipientId: '550e8400-e29b-41d4-a716-446655440001', amount: 50, frequency: 'weekly' })
        .expect(201);
    });
  });

  describe('PATCH /api/v1/recurring-transfers/:id', () => {
    it('should update (200)', async () => {
      mockRecurringService.update.mockResolvedValue(TestData.recurringTransfer({ amount: 100 }));
      await request(app.getHttpServer())
        .patch('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000')
        .send({ amount: 100 })
        .expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers/:id/pause', () => {
    it('should pause (200)', async () => {
      mockRecurringService.pause.mockResolvedValue(TestData.recurringTransfer({ status: 'paused' }));
      await request(app.getHttpServer())
        .post('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000/pause')
        .expect(200);
    });
  });

  describe('POST /api/v1/recurring-transfers/:id/resume', () => {
    it('should resume (200)', async () => {
      mockRecurringService.resume.mockResolvedValue(TestData.recurringTransfer({ status: 'active' }));
      await request(app.getHttpServer())
        .post('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000/resume')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/recurring-transfers/:id', () => {
    it('should delete (200)', async () => {
      mockRecurringService.delete.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/recurring-transfers/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
