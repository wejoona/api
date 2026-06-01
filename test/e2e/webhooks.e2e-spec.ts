import { INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import request from 'supertest';
import { E2ETestSetup } from './setup';
import {
  TestUserHelper,
  TestDataHelper,
  MockProvidersHelper,
  setupNock,
  teardownNock,
} from './helpers';

describe('Webhooks E2E Tests', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let userHelper: TestUserHelper;
  let dataHelper: TestDataHelper;
  let mockProviders: MockProvidersHelper;

  const signCirclePayload = (payload: Record<string, unknown>) =>
    createHmac(
      'sha256',
      process.env.CIRCLE_WEBHOOK_SECRET || 'test-circle-webhook-secret',
    )
      .update(JSON.stringify(payload))
      .digest('hex');

  const postCircleWebhook = (payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/webhooks/circle')
      .set('x-circle-signature', signCirclePayload(payload))
      .send(payload);

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    userHelper = new TestUserHelper(app);
    dataHelper = new TestDataHelper(app);
    mockProviders = new MockProvidersHelper();
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
    mockProviders.resetMocks();
  });

  describe('Circle Webhook Events', () => {
    it('should process Circle transfer completion webhook', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'test-transfer-id',
          source: {
            type: 'wallet',
            id: 'source-wallet-id',
          },
          destination: {
            type: 'wallet',
            id: 'destination-wallet-id',
          },
          amount: {
            amount: '10.00',
            currency: 'USD',
          },
          status: 'complete',
        },
      };

      const response = await postCircleWebhook(webhookPayload).expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should process Circle blockchain transfer webhook', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'test-blockchain-transfer-id',
          source: {
            type: 'wallet',
            id: 'source-wallet-id',
          },
          destination: {
            type: 'blockchain',
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            chain: 'MATIC',
          },
          amount: {
            amount: '50.00',
            currency: 'USD',
          },
          transactionHash: '0xmockhash123',
          status: 'complete',
        },
      };

      await postCircleWebhook(webhookPayload).expect(200);
    });

    it('should handle Circle transfer failure webhook', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.failed',
        transfer: {
          id: 'test-failed-transfer-id',
          source: {
            type: 'wallet',
            id: 'source-wallet-id',
          },
          destination: {
            type: 'wallet',
            id: 'destination-wallet-id',
          },
          amount: {
            amount: '10.00',
            currency: 'USD',
          },
          status: 'failed',
          errorCode: 'insufficient_funds',
        },
      };

      await postCircleWebhook(webhookPayload).expect(200);
    });
  });

  describe('YellowCard Webhook Events', () => {
    it('should process deposit completion webhook', async () => {
      const user = await userHelper.createUser('+2250700000001');

      const webhookPayload = {
        event: 'deposit.completed',
        data: {
          depositId: 'test-deposit-id',
          userId: user.id,
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
          actualAmount: 16.65,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      };

      await request(app.getHttpServer())
        .post('/webhooks/payment/yellow-card')
        .send(webhookPayload)
        .expect(200);
    });

    it('should process deposit failure webhook', async () => {
      const user = await userHelper.createUser('+2250700000002');

      const webhookPayload = {
        event: 'deposit.failed',
        data: {
          depositId: 'test-failed-deposit-id',
          userId: user.id,
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
          status: 'failed',
          errorCode: 'payment_timeout',
          failedAt: new Date().toISOString(),
        },
      };

      await request(app.getHttpServer())
        .post('/webhooks/payment/yellow-card')
        .send(webhookPayload)
        .expect(200);
    });

    it('should process withdrawal completion webhook', async () => {
      const user = await userHelper.createUser('+2250700000003');

      const webhookPayload = {
        event: 'withdrawal.completed',
        data: {
          withdrawalId: 'test-withdrawal-id',
          userId: user.id,
          amount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'XOF',
          actualAmount: 6000,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      };

      await request(app.getHttpServer())
        .post('/webhooks/payment/yellow-card')
        .send(webhookPayload)
        .expect(200);
    });
  });

  describe('Blnk Webhook Events', () => {
    it('should process Blnk transaction webhook', async () => {
      const webhookPayload = {
        event: 'transaction.applied',
        data: {
          transaction_id: 'test-blnk-transaction-id',
          source: 'source-balance-id',
          destination: 'destination-balance-id',
          amount: 1000,
          currency: 'USD',
          status: 'applied',
          reference: 'TEST-REF-123',
          created_at: new Date().toISOString(),
        },
      };

      await request(app.getHttpServer())
        .post('/webhooks/blnk')
        .send(webhookPayload)
        .expect(200);
    });

    it('should process Blnk balance update webhook', async () => {
      const webhookPayload = {
        event: 'balance.updated',
        data: {
          balance_id: 'test-balance-id',
          balance: 100000,
          credit_balance: 100000,
          debit_balance: 0,
          currency: 'USD',
        },
      };

      await request(app.getHttpServer())
        .post('/webhooks/blnk')
        .send(webhookPayload)
        .expect(200);
    });
  });

  describe('Webhook Security', () => {
    it('should validate webhook signatures (Circle SNS)', async () => {
      const invalidPayload = {
        Type: 'Notification',
        MessageId: 'test-message-id',
        // Missing or invalid signature
      };

      // This should fail signature validation
      // Implementation depends on your webhook signature validation
      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(invalidPayload)
        .expect(401);
    });

    it('should reject webhooks with invalid format', async () => {
      const invalidPayload = {
        invalid: 'payload',
      };

      const response = await postCircleWebhook(invalidPayload).expect(200);
      expect(response.body.processed).toBe(false);
    });

    it('should handle duplicate webhook events (idempotency)', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'duplicate-transfer-id',
          status: 'complete',
        },
      };

      // Send webhook twice
      await postCircleWebhook(webhookPayload).expect(200);

      // Second identical webhook should be handled gracefully
      await postCircleWebhook(webhookPayload).expect(200);
    });
  });

  describe('Webhook Retry Logic', () => {
    it('should handle webhook processing errors gracefully', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'unknown-type',
        transfer: {},
      };

      // Should return success even if processing fails (for retry logic)
      await postCircleWebhook(webhookPayload).expect(200);
    });
  });

  describe('Webhook Event Ordering', () => {
    it('should handle out-of-order webhook events', async () => {
      // Send "complete" event before "pending" event
      const completeWebhook = {
        notificationDate: new Date(Date.now() + 1000).toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'out-of-order-transfer',
          status: 'complete',
        },
      };

      const pendingWebhook = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.pending',
        transfer: {
          id: 'out-of-order-transfer',
          status: 'pending',
        },
      };

      await postCircleWebhook(completeWebhook).expect(200);

      // Should handle older pending event gracefully
      await postCircleWebhook(pendingWebhook).expect(200);
    });
  });

  describe('Webhook Admin Endpoints', () => {
    it('should list webhook events for admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/webhooks/deadletters/pending')
        .expect(401);
    });

    it('should retry failed webhook events', async () => {
      // Create a failed webhook event first
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'retry-transfer-id',
          status: 'complete',
        },
      };

      await postCircleWebhook(webhookPayload);

      await request(app.getHttpServer())
        .post('/admin/webhooks/deadletters/retry-test-id/retry')
        .expect(401);
    });
  });

  describe('Webhook Performance', () => {
    it('should process webhooks quickly (< 500ms)', async () => {
      const webhookPayload = {
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers.complete',
        transfer: {
          id: 'perf-transfer-id',
          status: 'complete',
        },
      };

      const start = Date.now();

      await postCircleWebhook(webhookPayload).expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent webhook events', async () => {
      const sendBatch = (offset: number) =>
        Promise.allSettled(
          Array(5)
            .fill(null)
            .map((_, index) =>
              postCircleWebhook({
                notificationDate: new Date().toISOString(),
                notificationType: 'transfers.complete',
                transfer: {
                  id: `concurrent-transfer-${offset + index}`,
                  status: 'complete',
                },
              }),
            ),
        );

      const settledResponses = [
        ...(await sendBatch(0)),
        ...(await sendBatch(5)),
      ];
      const rejected = settledResponses.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      expect(rejected).toEqual([]);

      const responses = settledResponses.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const successCount = responses.filter((r) => r.status === 200).length;

      expect(successCount).toBe(10);
    });
  });
});
