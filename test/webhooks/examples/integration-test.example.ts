import { INestApplication } from '@nestjs/common';
import { MockWebhookServer } from '../server/mock-webhook-server';
import { circleWebhookFixtures } from '../fixtures/circle-webhooks';
import { yellowCardWebhookFixtures } from '../fixtures/yellowcard-webhooks';
import { twilioWebhookFixtures } from '../fixtures/twilio-webhooks';

/**
 * Integration Test Example
 *
 * Demonstrates how to use the webhook testing utilities in integration tests.
 * This is a template - copy and adapt for your actual tests.
 */

describe('Webhook Integration Tests (Example)', () => {
  let app: INestApplication;
  let mockServer: MockWebhookServer;
  const appPort = 3000;
  const mockServerPort = 3005;

  beforeAll(async () => {
    // Setup your NestJS app
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile();
    //
    // app = moduleFixture.createNestApplication();
    // await app.listen(appPort);

    // Setup mock webhook server
    mockServer = new MockWebhookServer();
    await mockServer.start(mockServerPort);

    // Configure with your actual secrets
    mockServer.setSecrets({
      circle: process.env.CIRCLE_WEBHOOK_SECRET || 'test-circle-secret',
      yellowcard: process.env.YELLOWCARD_WEBHOOK_SECRET || 'test-yc-secret',
      twilio: process.env.TWILIO_AUTH_TOKEN || 'test-twilio-token',
    });
  });

  afterAll(async () => {
    await mockServer.stop();
    // await app.close();
  });

  afterEach(() => {
    mockServer.clearHistory();
  });

  describe('Circle Webhooks', () => {
    it('should handle transfer complete webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/circle`;
      const payload = circleWebhookFixtures.transferComplete;

      const response = await mockServer.sendCircleWebhook(targetUrl, payload);

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.attempts).toBe(1);

      // Verify in your database
      // const transfer = await transferRepo.findByCircleId(payload.notification.id);
      // expect(transfer.status).toBe('COMPLETE');
    });

    it('should handle transfer failed webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/circle`;
      const payload = circleWebhookFixtures.transferFailed;

      const response = await mockServer.sendCircleWebhook(targetUrl, payload);

      expect(response.success).toBe(true);

      // Verify failure was recorded
      // const transfer = await transferRepo.findByCircleId(payload.notification.id);
      // expect(transfer.status).toBe('FAILED');
      // expect(transfer.errorMessage).toContain('INSUFFICIENT_FUNDS');
    });

    it('should handle inbound transfer webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/circle`;
      const payload = circleWebhookFixtures.inboundComplete;

      const response = await mockServer.sendCircleWebhook(targetUrl, payload);

      expect(response.success).toBe(true);

      // Verify deposit was created
      // const deposit = await depositRepo.findByTxHash(payload.notification.txHash);
      // expect(deposit.status).toBe('COMPLETE');
    });

    it('should retry on 500 errors', async () => {
      mockServer.setRetryConfig({
        maxRetries: 3,
        retryDelays: [100, 200, 400],
        retryOnStatusCodes: [500],
      });

      // This would fail if your endpoint returns 500
      // const response = await mockServer.sendCircleWebhook(
      //   'http://localhost:9999/webhooks/circle',
      //   circleWebhookFixtures.transferComplete
      // );
      //
      // expect(response.attempts).toBeGreaterThan(1);
      // expect(response.success).toBe(false);
    });
  });

  describe('Yellow Card Webhooks', () => {
    it('should handle payment complete webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/payment/yellow-card`;
      const payload = yellowCardWebhookFixtures.paymentCompleteOrangeMoney;

      const response = await mockServer.sendYellowCardWebhook(
        targetUrl,
        payload,
      );

      expect(response.success).toBe(true);

      // Verify deposit was credited
      // const deposit = await depositRepo.findByReference(payload.data.reference);
      // expect(deposit.status).toBe('COMPLETE');
      // expect(deposit.amount).toBe(10); // 10 USDC
    });

    it('should handle payout complete webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/payment/yellow-card`;
      const payload = yellowCardWebhookFixtures.payoutCompleteOrangeMoney;

      const response = await mockServer.sendYellowCardWebhook(
        targetUrl,
        payload,
      );

      expect(response.success).toBe(true);

      // Verify withdrawal was completed
      // const withdrawal = await withdrawalRepo.findByReference(payload.data.reference);
      // expect(withdrawal.status).toBe('COMPLETE');
    });

    it('should handle payment failed webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/payment/yellow-card`;
      const payload = yellowCardWebhookFixtures.paymentFailed;

      const response = await mockServer.sendYellowCardWebhook(
        targetUrl,
        payload,
      );

      expect(response.success).toBe(true);

      // Verify failure was recorded
      // const deposit = await depositRepo.findByReference(payload.data.reference);
      // expect(deposit.status).toBe('FAILED');
      // expect(deposit.failureReason).toBeDefined();
    });
  });

  describe('Twilio Webhooks', () => {
    it('should handle SMS delivered webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/twilio/sms-status`;
      const payload = twilioWebhookFixtures.deliveredIvoryCoast;

      const response = await mockServer.sendTwilioWebhook(targetUrl, payload);

      expect(response.success).toBe(true);

      // Verify SMS status was updated
      // const sms = await smsRepo.findByMessageSid(payload.MessageSid);
      // expect(sms.status).toBe('delivered');
    });

    it('should handle SMS failed webhook', async () => {
      const targetUrl = `http://localhost:${appPort}/webhooks/twilio/sms-status`;
      const payload = twilioWebhookFixtures.failedInvalidNumber;

      const response = await mockServer.sendTwilioWebhook(targetUrl, payload);

      expect(response.success).toBe(true);

      // Verify failure was recorded
      // const sms = await smsRepo.findByMessageSid(payload.MessageSid);
      // expect(sms.status).toBe('failed');
      // expect(sms.errorCode).toBe('21211');
    });
  });

  describe('Full Flow Tests', () => {
    it('should handle complete deposit flow', async () => {
      // 1. Yellow Card payment complete
      const ycPayload = yellowCardWebhookFixtures.paymentCompleteOrangeMoney;
      const ycResponse = await mockServer.sendYellowCardWebhook(
        `http://localhost:${appPort}/webhooks/payment/yellow-card`,
        ycPayload,
      );
      expect(ycResponse.success).toBe(true);

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. Circle transfer complete
      const circlePayload = circleWebhookFixtures.transferComplete;
      const circleResponse = await mockServer.sendCircleWebhook(
        `http://localhost:${appPort}/webhooks/circle`,
        circlePayload,
      );
      expect(circleResponse.success).toBe(true);

      // 3. Twilio SMS delivered
      const twilioPayload = twilioWebhookFixtures.depositConfirmation;
      const twilioResponse = await mockServer.sendTwilioWebhook(
        `http://localhost:${appPort}/webhooks/twilio/sms-status`,
        twilioPayload,
      );
      expect(twilioResponse.success).toBe(true);

      // Verify complete flow in database
      // const deposit = await depositRepo.findByReference(ycPayload.data.reference);
      // expect(deposit.status).toBe('COMPLETE');
      // expect(deposit.smsStatus).toBe('delivered');
    });
  });

  describe('Webhook History', () => {
    it('should track all webhook attempts', async () => {
      const payload = circleWebhookFixtures.transferComplete;
      await mockServer.sendCircleWebhook(
        `http://localhost:${appPort}/webhooks/circle`,
        payload,
      );

      const history = mockServer.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].provider).toBe('circle');
      expect(history[0].attempts.length).toBeGreaterThan(0);
    });
  });
});
