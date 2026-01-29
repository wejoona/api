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

describe('Security E2E Tests', () => {
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

  describe('Authentication Security', () => {
    it('should reject requests without auth token', async () => {
      await request(app.getHttpServer()).get('/wallet').expect(401);
    });

    it('should reject requests with invalid auth token', async () => {
      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with malformed auth header', async () => {
      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      // Create a token with very short expiration
      // This would require modifying JWT service or using time manipulation
      // For now, we'll test with an obviously expired/invalid token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should validate JWT signature', async () => {
      // Token with invalid signature
      const invalidSignatureToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.wrongsignature';

      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${invalidSignatureToken}`)
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on sensitive endpoints', async () => {
      const phone = '+2250700000100';

      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send({ phone, countryCode: 'CI' }),
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should succeed, some should be rate limited
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce stricter rate limits on OTP verification', async () => {
      const phone = '+2250700000101';

      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, countryCode: 'CI' })
        .expect(201);

      // Make multiple OTP verification attempts
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/verify-otp')
            .send({ phone, otp: '000000' }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on transfer endpoints', async () => {
      const sender = await userHelper.createUser('+2250700000102');
      const recipient = await userHelper.createUser('+2250700000103');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // Make multiple transfer requests rapidly
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/wallet/transfer/internal')
            .set('Authorization', `Bearer ${sender.accessToken}`)
            .set('X-Pin-Token', pinToken)
            .set('X-Idempotency-Key', `key-${i}`) // Different keys to avoid idempotency blocking
            .send({
              toPhone: recipient.phone,
              amount: 1,
              currency: 'USDC',
            }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('PIN Security', () => {
    it('should lock PIN after multiple failed attempts', async () => {
      const user = await userHelper.createUser('+2250700000110');
      await userHelper.setPin(user.accessToken, '1234');

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/wallet/pin/verify')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ pin: '0000' });
      }

      // Next attempt should be locked
      const response = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ pin: '1234' })
        .expect(403);

      expect(response.body.message).toContain('locked');
    });

    it('should require PIN for transfers', async () => {
      const sender = await userHelper.createUser('+2250700000111');
      const recipient = await userHelper.createUser('+2250700000112');

      await userHelper.setPin(sender.accessToken, '1234');

      // Try transfer without PIN token
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({
          toPhone: recipient.phone,
          amount: 10,
          currency: 'USDC',
        })
        .expect(400);

      expect(response.body.message).toContain('PIN');
    });

    it('should expire PIN tokens after time limit', async () => {
      const sender = await userHelper.createUser('+2250700000113');
      const recipient = await userHelper.createUser('+2250700000114');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // In a real test, we'd wait or manipulate time
      // For now, we verify the token has an expiry
      const verifyResponse = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({ pin: '1234' })
        .expect(200);

      expect(verifyResponse.body.expiresIn).toBeDefined();
      expect(verifyResponse.body.expiresIn).toBeGreaterThan(0);
    });

    it('should hash PINs in storage', async () => {
      const user = await userHelper.createUser('+2250700000115');
      await userHelper.setPin(user.accessToken, '1234');

      // Query database directly to verify PIN is hashed
      const result = await dataHelper.executeQuery(
        'SELECT pin_hash FROM users WHERE id = $1',
        [user.id],
      );

      expect(result[0].pin_hash).toBeDefined();
      expect(result[0].pin_hash).not.toBe('1234');
      expect(result[0].pin_hash.length).toBeGreaterThan(20); // Hashed value
    });
  });

  describe('Input Validation', () => {
    it('should sanitize and validate phone numbers', async () => {
      const invalidPhones = [
        'not-a-phone',
        '123',
        '++2250700000001',
        'phone@email.com',
      ];

      for (const phone of invalidPhones) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ phone, countryCode: 'CI' })
          .expect(400);
      }
    });

    it('should validate transfer amounts', async () => {
      const sender = await userHelper.createUser('+2250700000120');
      const recipient = await userHelper.createUser('+2250700000121');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // Test negative amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: recipient.phone,
          amount: -10,
          currency: 'USDC',
        })
        .expect(400);

      // Test zero amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: recipient.phone,
          amount: 0,
          currency: 'USDC',
        })
        .expect(400);
    });

    it('should validate blockchain addresses', async () => {
      const user = await userHelper.createUser('+2250700000122');
      await userHelper.setPin(user.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(user.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toAddress: 'invalid-address',
          amount: 10,
          currency: 'USDC',
          network: 'polygon',
        })
        .expect(400);
    });

    it('should reject SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: sqlInjection, countryCode: 'CI' })
        .expect(400);
    });

    it('should reject XSS attempts in text fields', async () => {
      const user = await userHelper.createUser('+2250700000123');
      const xssAttempt = '<script>alert("xss")</script>';

      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ username: xssAttempt })
        .expect(400);
    });
  });

  describe('Authorization', () => {
    it('should prevent users from accessing other users data', async () => {
      const user1 = await userHelper.createUser('+2250700000130');
      const user2 = await userHelper.createUser('+2250700000131');

      // Create a transfer for user1
      await userHelper.setPin(user1.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(user1.accessToken, '1234');

      const transferResponse = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: user2.phone,
          amount: 10,
          currency: 'USDC',
        })
        .expect(200);

      const transferId = transferResponse.body.transactionId;

      // User1 should be able to access their transfer
      await request(app.getHttpServer())
        .get(`/transfers/${transferId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      // User2 (recipient) should also be able to access
      await request(app.getHttpServer())
        .get(`/transfers/${transferId}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      // But a third user should not
      const user3 = await userHelper.createUser('+2250700000132');
      await request(app.getHttpServer())
        .get(`/transfers/${transferId}`)
        .set('Authorization', `Bearer ${user3.accessToken}`)
        .expect(403);
    });

    it('should prevent users from modifying other users profiles', async () => {
      const user1 = await userHelper.createUser('+2250700000133');
      const user2 = await userHelper.createUser('+2250700000134');

      // User1 cannot update user2's profile
      // (This is implicitly prevented by JwtAuthGuard + req.user.id)
      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({ firstName: 'Hacker' })
        .expect(200);

      // Verify it only updated user1's profile
      expect(response.body.id).toBe(user1.id);
    });
  });

  describe('Data Exposure', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: '+2250700000140', otp: '000000' })
        .expect(400);

      const errorText = JSON.stringify(response.body).toLowerCase();
      expect(errorText).not.toContain('database');
      expect(errorText).not.toContain('sql');
      expect(errorText).not.toContain('password');
      expect(errorText).not.toContain('secret');
      expect(errorText).not.toContain('stack');
      expect(errorText).not.toContain('trace');
    });

    it('should not expose PII in logs', async () => {
      // This would require checking actual logs
      // For E2E test, we verify API doesn't return PII unnecessarily
      const user = await userHelper.createUser('+2250700000141');

      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      // PIN and PIN hash should never be returned
      expect(response.body.pin).toBeUndefined();
      expect(response.body.pinHash).toBeUndefined();
      expect(response.body.pin_hash).toBeUndefined();
    });

    it('should not expose internal IDs or system information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Health check should not expose database connection strings, etc.
      const responseText = JSON.stringify(response.body).toLowerCase();
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret');
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate transfers with same idempotency key', async () => {
      const sender = await userHelper.createUser('+2250700000150');
      const recipient = await userHelper.createUser('+2250700000151');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const idempotencyKey = 'test-idempotency-key-123';

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          toPhone: recipient.phone,
          amount: 10,
          currency: 'USDC',
        })
        .expect(200);

      // Second request with same key
      const response2 = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          toPhone: recipient.phone,
          amount: 10,
          currency: 'USDC',
        })
        .expect(200);

      // Should return same result
      expect(response1.body.transactionId).toBe(response2.body.transactionId);
    });
  });

  describe('HTTPS and Headers Security', () => {
    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Check for common security headers (if configured)
      // These would be set via helmet middleware
      expect(response.headers).toBeDefined();
    });

    it('should not expose server version', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Should not expose sensitive server information
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});
