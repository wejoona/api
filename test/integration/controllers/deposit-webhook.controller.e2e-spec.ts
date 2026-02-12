/**
 * Deposit Webhook Controller Integration Tests
 * Tests the PUBLIC webhook endpoint (no auth)
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockDepositWebhookService = {
  handleWebhook: jest.fn(),
};

import { DepositWebhookController } from '@modules/deposit/application/controllers/deposit-webhook.controller';
import { DepositWebhookService } from '@modules/deposit/application/services/deposit-webhook.service';

describe('DepositWebhookController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DepositWebhookController],
      providers: [{ provide: DepositWebhookService, useValue: mockDepositWebhookService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/deposits/webhook/:providerCode', () => {
    it('should process webhook from MTN (200)', async () => {
      mockDepositWebhookService.handleWebhook.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/deposits/webhook/mtn')
        .send({ transactionId: 'tx_123', status: 'completed', amount: 5000 })
        .expect(200);
    });

    it('should handle unknown provider gracefully', async () => {
      mockDepositWebhookService.handleWebhook.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/deposits/webhook/unknown')
        .send({ data: {} })
        .expect(200);
    });

    it('should accept empty body (webhook providers vary)', async () => {
      mockDepositWebhookService.handleWebhook.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/deposits/webhook/mtn')
        .send({})
        .expect(200);
    });
  });
});
