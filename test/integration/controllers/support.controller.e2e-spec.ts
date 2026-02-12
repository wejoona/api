/**
 * Support Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockSupportService = {
  createTicket: jest.fn(),
  getTickets: jest.fn(),
  getTicketById: jest.fn(),
  addMessage: jest.fn(),
  closeTicket: jest.fn(),
};

import { SupportController } from '@modules/support/application/controllers/support.controller';
import { SupportService } from '@modules/support/application/services/support.service';

describe('SupportController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: mockSupportService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/support/tickets', () => {
    it('should create ticket (201)', async () => {
      mockSupportService.createTicket.mockResolvedValue({ id: 'tick_123', status: 'open' });
      await request(app.getHttpServer())
        .post('/api/v1/support/tickets')
        .send({ subject: 'Help', message: 'I need help' })
        .expect(201);
    });
  });

  describe('GET /api/v1/support/tickets', () => {
    it('should list tickets (200)', async () => {
      mockSupportService.getTickets.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/support/tickets').expect(200);
    });
  });

  describe('GET /api/v1/support/tickets/:id', () => {
    it('should get ticket (200)', async () => {
      mockSupportService.getTicketById.mockResolvedValue({ id: 'tick_123' });
      await request(app.getHttpServer()).get('/api/v1/support/tickets/tick_123').expect(200);
    });
  });

  describe('POST /api/v1/support/tickets/:id/messages', () => {
    it('should add message (200)', async () => {
      mockSupportService.addMessage.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/support/tickets/tick_123/messages')
        .send({ message: 'Follow up' })
        .expect(200);
    });
  });
});
