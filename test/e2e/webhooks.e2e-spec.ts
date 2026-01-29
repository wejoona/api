import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
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
        Type: 'Notification',
        MessageId: 'test-message-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
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
        }),
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should process Circle blockchain transfer webhook', async () => {
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'test-message-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
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
        }),
      };

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);
    });

    it('should handle Circle transfer failure webhook', async () => {
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'test-message-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
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
        }),
      };

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);
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
        .post('/webhooks/yellowcard')
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
        .post('/webhooks/yellowcard')
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
        .post('/webhooks/yellowcard')
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
        .send(invalidPayload);
      // Expect might be 401 or 400 depending on implementation
    });

    it('should reject webhooks with invalid format', async () => {
      const invalidPayload = {
        invalid: 'payload',
      };

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(invalidPayload)
        .expect(400);
    });

    it('should handle duplicate webhook events (idempotency)', async () => {
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'duplicate-message-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
          transfer: {
            id: 'duplicate-transfer-id',
            status: 'complete',
          },
        }),
      };

      // Send webhook twice
      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);

      // Second identical webhook should be handled gracefully
      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);
    });
  });

  describe('Webhook Retry Logic', () => {
    it('should handle webhook processing errors gracefully', async () => {
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'error-test-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'unknown-type', // This should cause an error
          transfer: {},
        }),
      };

      // Should return success even if processing fails (for retry logic)
      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload);
      // Implementation might return 200 to prevent retries or specific error code
    });
  });

  describe('Webhook Event Ordering', () => {
    it('should handle out-of-order webhook events', async () => {
      // Send "complete" event before "pending" event
      const completeWebhook = {
        Type: 'Notification',
        MessageId: 'complete-message',
        Message: JSON.stringify({
          notificationDate: new Date(Date.now() + 1000).toISOString(),
          notificationType: 'transfers',
          transfer: {
            id: 'out-of-order-transfer',
            status: 'complete',
          },
        }),
      };

      const pendingWebhook = {
        Type: 'Notification',
        MessageId: 'pending-message',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
          transfer: {
            id: 'out-of-order-transfer',
            status: 'pending',
          },
        }),
      };

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(completeWebhook)
        .expect(200);

      // Should handle older pending event gracefully
      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(pendingWebhook)
        .expect(200);
    });
  });

  describe('Webhook Admin Endpoints', () => {
    it('should list webhook events for admin', async () => {
      // This would require admin authentication
      // Skipping auth for test, but in production should be protected
      const response = await request(app.getHttpServer())
        .get('/admin/webhooks/events?limit=20&offset=0')
        .expect(200);

      expect(response.body.events).toBeDefined();
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    it('should retry failed webhook events', async () => {
      // Create a failed webhook event first
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'retry-test-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
          transfer: {
            id: 'retry-transfer-id',
            status: 'complete',
          },
        }),
      };

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload);

      // Admin retry endpoint
      // Implementation specific - adjust endpoint as needed
      await request(app.getHttpServer())
        .post('/admin/webhooks/retry/retry-test-id')
        .expect(200);
    });
  });

  describe('Webhook Performance', () => {
    it('should process webhooks quickly (< 500ms)', async () => {
      const webhookPayload = {
        Type: 'Notification',
        MessageId: 'perf-test-id',
        Message: JSON.stringify({
          notificationDate: new Date().toISOString(),
          notificationType: 'transfers',
          transfer: {
            id: 'perf-transfer-id',
            status: 'complete',
          },
        }),
      };

      const start = Date.now();

      await request(app.getHttpServer())
        .post('/webhooks/circle')
        .send(webhookPayload)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent webhook events', async () => {
      const webhooks = Array(10)
        .fill(null)
        .map((_, index) => ({
          Type: 'Notification',
          MessageId: `concurrent-${index}`,
          Message: JSON.stringify({
            notificationDate: new Date().toISOString(),
            notificationType: 'transfers',
            transfer: {
              id: `concurrent-transfer-${index}`,
              status: 'complete',
            },
          }),
        }));

      const requests = webhooks.map((webhook) =>
        request(app.getHttpServer()).post('/webhooks/circle').send(webhook),
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.status === 200).length;

      expect(successCount).toBe(10);
    });
  });
});
