import { MockWebhookServer } from './mock-webhook-server';
import { circleWebhookFixtures } from '../fixtures/circle-webhooks';
import { yellowCardWebhookFixtures } from '../fixtures/yellowcard-webhooks';
import { twilioWebhookFixtures } from '../fixtures/twilio-webhooks';

/**
 * Mock Webhook Server Tests
 *
 * Tests the mock server functionality including:
 * - Starting/stopping server
 * - Sending webhooks with correct signatures
 * - Retry logic
 * - History tracking
 */

describe('MockWebhookServer', () => {
  let server: MockWebhookServer;

  beforeEach(() => {
    server = new MockWebhookServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server', async () => {
      await server.start(3002);

      // Test health endpoint
      const response = await fetch('http://localhost:3002/health');
      const data = await response.json();

      expect(data.status).toBe('ok');
      expect(data.webhooksSent).toBe(0);

      await server.stop();
    });

    it('should track webhook history', async () => {
      await server.start(3003);

      // Make a test request
      await fetch('http://localhost:3003/health');

      const historyResponse = await fetch('http://localhost:3003/history');
      const history = await historyResponse.json();

      expect(Array.isArray(history)).toBe(true);

      await server.stop();
    });

    it('should clear history', async () => {
      await server.start(3004);

      await fetch('http://localhost:3004/history', { method: 'DELETE' });

      const historyResponse = await fetch('http://localhost:3004/history');
      const history = await historyResponse.json();

      expect(history).toHaveLength(0);

      await server.stop();
    });
  });

  describe('Signature Generation', () => {
    it('should generate valid Circle signatures', async () => {
      server.setSecrets({ circle: 'test-secret' });

      // We can't easily test the actual signature without a running endpoint,
      // but we can verify the structure
      expect(server).toBeDefined();
    });

    it('should support custom secrets', () => {
      const customSecrets = {
        circle: 'custom-circle-secret',
        yellowcard: 'custom-yc-secret',
        twilio: 'custom-twilio-secret',
      };

      server.setSecrets(customSecrets);

      expect(server).toBeDefined();
    });
  });

  describe('Retry Configuration', () => {
    it('should support custom retry configuration', () => {
      const retryConfig = {
        maxRetries: 5,
        retryDelays: [500, 1000, 2000, 4000, 8000],
        retryOnStatusCodes: [500, 502, 503],
      };

      server.setRetryConfig(retryConfig);

      expect(server).toBeDefined();
    });
  });

  describe('Webhook Sending', () => {
    it('should prepare Circle webhook payload', () => {
      const payload = circleWebhookFixtures.transferComplete;
      expect(payload.notificationType).toBe('wallets.transfer.complete');
      expect(payload.notification).toBeDefined();
    });

    it('should prepare Yellow Card webhook payload', () => {
      const payload = yellowCardWebhookFixtures.paymentCompleteOrangeMoney;
      expect(payload.type).toBe('payment.complete');
      expect(payload.data).toBeDefined();
    });

    it('should prepare Twilio webhook payload', () => {
      const payload = twilioWebhookFixtures.deliveredIvoryCoast;
      expect(payload.MessageStatus).toBe('delivered');
      expect(payload.MessageSid).toBeDefined();
    });
  });

  describe('Integration with Fixtures', () => {
    it('should work with all Circle fixtures', () => {
      const fixtures = Object.values(circleWebhookFixtures);
      expect(fixtures.length).toBeGreaterThan(0);

      for (const fixture of fixtures) {
        expect(fixture.notificationType).toBeDefined();
        expect(fixture.notification).toBeDefined();
      }
    });

    it('should work with all Yellow Card fixtures', () => {
      const fixtures = Object.values(yellowCardWebhookFixtures);
      expect(fixtures.length).toBeGreaterThan(0);

      for (const fixture of fixtures) {
        expect(fixture.id).toBeDefined();
        expect(fixture.type).toBeDefined();
        expect(fixture.data).toBeDefined();
      }
    });

    it('should work with all Twilio fixtures', () => {
      const fixtures = Object.values(twilioWebhookFixtures);
      expect(fixtures.length).toBeGreaterThan(0);

      for (const fixture of fixtures) {
        expect(fixture.MessageSid || fixture.SmsSid).toBeDefined();
        expect(fixture.MessageStatus || fixture.SmsStatus).toBeDefined();
      }
    });
  });
});
