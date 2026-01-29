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

describe('Performance E2E Tests', () => {
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

  describe('Response Time Baselines', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/health').expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should authenticate user within 500ms', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: '+2250700000001', countryCode: 'CI' });

      const start = Date.now();

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: '+2250700000001', otp: '123456' })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should fetch wallet balance within 300ms', async () => {
      const user = await userHelper.createUser('+2250700000002');

      const start = Date.now();

      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });

    it('should process transfer within 1000ms', async () => {
      const sender = await userHelper.createUser('+2250700000003');
      const recipient = await userHelper.createUser('+2250700000004');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const start = Date.now();

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: recipient.phone,
          amount: 10,
          currency: 'USDC',
        })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should fetch transaction history within 500ms', async () => {
      const user = await userHelper.createUser('+2250700000005');

      const start = Date.now();

      await request(app.getHttpServer())
        .get('/transfers?limit=20&offset=0')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 50 concurrent balance requests', async () => {
      const user = await userHelper.createUser('+2250700000010');

      const concurrentRequests = 50;
      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/wallet')
            .set('Authorization', `Bearer ${user.accessToken}`),
        );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBe(concurrentRequests);
      expect(duration).toBeLessThan(5000); // All should complete within 5 seconds
    });

    it('should handle concurrent transfers from different users', async () => {
      const users = await userHelper.createUsers(10);
      const recipient = await userHelper.createUser('+2250799999999');

      // Setup PINs for all users
      const setupPromises = users.map(async (user) => {
        await userHelper.setPin(user.accessToken, '1234');
        return userHelper.verifyPin(user.accessToken, '1234');
      });
      const pinTokens = await Promise.all(setupPromises);

      // Concurrent transfers
      const transferPromises = users.map((user, index) =>
        request(app.getHttpServer())
          .post('/wallet/transfer/internal')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .set('X-Pin-Token', pinTokens[index])
          .set('X-Idempotency-Key', `concurrent-${index}`)
          .send({
            toPhone: recipient.phone,
            amount: 1,
            currency: 'USDC',
          }),
      );

      const start = Date.now();
      const responses = await Promise.all(transferPromises);
      const duration = Date.now() - start;

      const successCount = responses.filter(
        (r) => r.status === 200 || r.status === 201,
      ).length;
      expect(successCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000);
    });

    it('should handle concurrent user registrations', async () => {
      const concurrentRegistrations = 20;
      const registrations = Array(concurrentRegistrations)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              phone: `+22507${String(index).padStart(8, '0')}`,
              countryCode: 'CI',
            }),
        );

      const start = Date.now();
      const responses = await Promise.all(registrations);
      const duration = Date.now() - start;

      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Database Query Performance', () => {
    it('should efficiently query transaction history with pagination', async () => {
      const user = await userHelper.createUser('+2250700000020');

      // Create multiple transactions
      for (let i = 0; i < 50; i++) {
        await dataHelper.createTestDeposit(user.id, 10);
      }

      const start = Date.now();

      await request(app.getHttpServer())
        .get('/transfers?limit=20&offset=0')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should efficiently search users by username', async () => {
      // Create multiple users with usernames
      const users = await userHelper.createUsers(20);

      for (let i = 0; i < users.length; i++) {
        await userHelper.updateProfile(users[i].accessToken, {
          username: `testuser${i}`,
        });
      }

      const searcher = await userHelper.createUser('+2250799999998');

      const start = Date.now();

      await request(app.getHttpServer())
        .get('/user/username/search?query=testuser&limit=10')
        .set('Authorization', `Bearer ${searcher.accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Caching Performance', () => {
    it('should cache wallet balance for faster subsequent requests', async () => {
      const user = await userHelper.createUser('+2250700000030');

      // First request (cold cache)
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
      const duration1 = Date.now() - start1;

      // Second request (should be cached)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
      const duration2 = Date.now() - start2;

      // Cached request should be faster (or at least not significantly slower)
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });

    it('should cache exchange rates for faster quotes', async () => {
      const user = await userHelper.createUser('+2250700000031');

      // First rate request
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
      const duration1 = Date.now() - start1;

      // Second identical request
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should maintain performance under sustained load', async () => {
      const user = await userHelper.createUser('+2250700000040');

      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer()).get('/health').expect(200);

        durations.push(Date.now() - start);
      }

      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(100);
      expect(maxDuration).toBeLessThan(500); // No request should take more than 500ms
    });

    it('should handle burst traffic', async () => {
      const users = await userHelper.createUsers(5);

      // Create burst of requests
      const burstSize = 25;
      const requests = [];

      for (let i = 0; i < burstSize; i++) {
        const user = users[i % users.length];
        requests.push(
          request(app.getHttpServer())
            .get('/wallet')
            .set('Authorization', `Bearer ${user.accessToken}`),
        );
      }

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBe(burstSize);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated requests', async () => {
      const user = await userHelper.createUser('+2250700000050');

      // Get initial memory
      const initialMemory = process.memoryUsage().heapUsed;

      // Make many requests
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer()).get('/health').expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should efficiently handle large paginated datasets', async () => {
      const user = await userHelper.createUser('+2250700000051');

      // Create many transactions
      for (let i = 0; i < 100; i++) {
        await dataHelper.createTestDeposit(user.id, 10);
      }

      // Request different pages
      const pageTests = [0, 20, 40, 60, 80].map((offset) =>
        request(app.getHttpServer())
          .get(`/transfers?limit=20&offset=${offset}`)
          .set('Authorization', `Bearer ${user.accessToken}`),
      );

      const start = Date.now();
      const responses = await Promise.all(pageTests);
      const duration = Date.now() - start;

      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Database Connection Pool', () => {
    it('should efficiently reuse database connections', async () => {
      const users = await userHelper.createUsers(10);

      // Make concurrent database-heavy requests
      const requests = users.map((user) =>
        request(app.getHttpServer())
          .get('/wallet')
          .set('Authorization', `Bearer ${user.accessToken}`),
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('API Gateway Performance', () => {
    it('should handle mixed endpoint requests efficiently', async () => {
      const user = await userHelper.createUser('+2250700000060');

      const mixedRequests = [
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer())
          .get('/wallet')
          .set('Authorization', `Bearer ${user.accessToken}`),
        request(app.getHttpServer())
          .get('/user/profile')
          .set('Authorization', `Bearer ${user.accessToken}`),
        request(app.getHttpServer())
          .get('/transfers')
          .set('Authorization', `Bearer ${user.accessToken}`),
      ];

      const start = Date.now();
      await Promise.all(mixedRequests);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
