/**
 * Deposit Webhook Controller Integration Tests
 * Tests the PUBLIC webhook endpoint (no auth)
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockDepositService = {
  handleWebhook: jest.fn(),
};
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    if (key === 'nodeEnv') return 'development';
    return defaultValue ?? '';
  }),
};

import { DepositWebhookController } from '@modules/deposit/application/controllers/deposit-webhook.controller';
import { DepositService } from '@modules/deposit/application/services/deposit.service';
import { ConfigService } from '@nestjs/config';

describe('DepositWebhookController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DepositWebhookController],
      providers: [
        { provide: DepositService, useValue: mockDepositService },
        { provide: ConfigService, useValue: mockConfigService },
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

  describe('POST /api/v1/deposits/webhook/:providerCode', () => {
    it('should process webhook from MTN (200)', async () => {
      mockDepositService.handleWebhook.mockResolvedValue({
        success: true,
      });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/deposit/mtn')
        .send({ transactionId: 'tx_123', status: 'completed', amount: 5000 })
        .expect(200);
    });

    it('should handle unknown provider gracefully', async () => {
      mockDepositService.handleWebhook.mockResolvedValue({
        success: true,
      });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/deposit/unknown')
        .send({ data: {} })
        .expect(200);
    });

    it('should accept empty body (webhook providers vary)', async () => {
      mockDepositService.handleWebhook.mockResolvedValue({
        success: true,
      });
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/deposit/mtn')
        .send({})
        .expect(200);
    });
  });
});
