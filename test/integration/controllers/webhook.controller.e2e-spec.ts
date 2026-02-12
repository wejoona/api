/**
 * Webhook Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockProcessWebhook = { execute: jest.fn() };

import { WebhookController } from '@modules/webhook/application/controllers/webhook.controller';
import { ProcessWebhookUseCase } from '@modules/webhook/application/usecases/process-webhook.use-case';

describe('WebhookController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [WebhookController],
      providers: [{ provide: ProcessWebhookUseCase, useValue: mockProcessWebhook }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/webhooks/payment', () => {
    it('should process payment webhook (200)', async () => {
      mockProcessWebhook.execute.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/payment')
        .send({ event: 'payment.completed', data: { id: 'pay_123' } })
        .expect(200);
    });

    it('should handle empty payload gracefully', async () => {
      mockProcessWebhook.execute.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/payment')
        .send({})
        .expect(200);
    });
  });

  describe('POST /api/v1/webhooks/payment/yellow-card', () => {
    it('should process Yellow Card webhook (200)', async () => {
      mockProcessWebhook.execute.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/payment/yellow-card')
        .send({ type: 'transaction.completed', referenceId: 'ref_123' })
        .expect(200);
    });
  });

  describe('POST /api/v1/webhooks/circle', () => {
    it('should process Circle webhook (200)', async () => {
      mockProcessWebhook.execute.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/circle')
        .send({ type: 'transfer.complete', data: {} })
        .expect(200);
    });
  });
});
