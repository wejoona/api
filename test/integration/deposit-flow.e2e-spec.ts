import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import nock from 'nock';

/**
 * Deposit Flow Integration Tests
 *
 * Tests the complete deposit journey:
 * 1. Get deposit channels (mobile money providers)
 * 2. Get rate quote (XOF to USDC)
 * 3. Initiate deposit
 * 4. Receive payment instructions
 * 5. Process webhook (payment confirmation)
 * 6. Verify balance update
 *
 * Uses testcontainers for PostgreSQL and Redis isolation.
 */
describe('Deposit Flow (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let dataSource: DataSource;

  // Test user credentials
  let accessToken: string;
  let userId: string;
  let pinToken: string;

  jest.setTimeout(120000);

  beforeAll(async () => {
    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Start Redis container
    console.log('Starting Redis container...');
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Configure environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = postgresContainer.getHost();
    process.env.DATABASE_PORT = postgresContainer.getPort().toString();
    process.env.DATABASE_NAME = 'test_db';
    process.env.DATABASE_USER = 'test_user';
    process.env.DATABASE_PASSWORD = 'test_password';
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
    process.env.REDIS_PASSWORD = '';
    process.env.REDIS_DB = '0';

    // JWT configuration
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-for-integration-tests';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';

    // Rate limiting (permissive for tests)
    process.env.RATE_LIMIT_TTL = '60';
    process.env.RATE_LIMIT_LIMIT = '1000';

    // External API URLs
    process.env.YELLOWCARD_API_URL = 'http://localhost:3999/yellowcard';
    process.env.BLNK_API_URL = 'http://localhost:3999/blnk';
    process.env.CIRCLE_API_URL = 'http://localhost:3999/circle';

    // Disable external notifications
    process.env.NOTIFICATION_ENABLED = 'false';

    // Setup nock
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    nock.enableNetConnect('localhost');

    setupExternalApiMocks();

    // Create NestJS application
    console.log('Creating NestJS application...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Get DataSource and run migrations
    dataSource = app.get(DataSource);
    console.log('Running database migrations...');
    await dataSource.runMigrations();

    // Create test user
    await setupTestUser();

    console.log('Integration test setup complete');
  });

  afterAll(async () => {
    console.log('Tearing down integration tests...');

    nock.cleanAll();
    nock.enableNetConnect();

    if (dataSource) {
      await dataSource.destroy();
    }

    if (app) {
      await app.close();
    }

    if (postgresContainer) {
      await postgresContainer.stop();
    }

    if (redisContainer) {
      await redisContainer.stop();
    }

    console.log('Integration test teardown complete');
  });

  async function setupTestUser() {
    const testPhone = '+2250700000001';

    // Register user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: testPhone, countryCode: 'CI' })
      .expect(201);

    // Verify OTP
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone: testPhone, otp: '123456' })
      .expect(200);

    accessToken = verifyResponse.body.accessToken;
    userId = verifyResponse.body.user.id;

    // Set PIN
    await request(app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin: '1234', confirmPin: '1234' })
      .expect(200);

    // Get PIN token
    const pinResponse = await request(app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin: '1234' })
      .expect(200);

    pinToken = pinResponse.body.pinToken;
  }

  function setupExternalApiMocks() {
    const yellowcardUrl = process.env.YELLOWCARD_API_URL;
    const blnkUrl = process.env.BLNK_API_URL;
    const circleUrl = process.env.CIRCLE_API_URL;

    // Mock YellowCard channels
    nock(yellowcardUrl)
      .get('/channels')
      .reply(200, {
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            currency: 'XOF',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
          },
          {
            id: 'mtn_money_ci',
            name: 'MTN Money',
            type: 'mobile_money',
            provider: 'mtn',
            country: 'CI',
            currency: 'XOF',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
          },
          {
            id: 'wave_ci',
            name: 'Wave',
            type: 'mobile_money',
            provider: 'wave',
            country: 'CI',
            currency: 'XOF',
            minAmount: 500,
            maxAmount: 1000000,
            fee: 1.0,
            feeType: 'percentage',
          },
        ],
      })
      .persist();

    // Mock rate quote
    nock(yellowcardUrl)
      .post('/rates/quote')
      .reply(200, (uri, body: any) => ({
        rate: 600.5,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        sourceAmount: body.amount || 10000,
        targetAmount: parseFloat(((body.amount || 10000) / 600.5).toFixed(2)),
        fee: Math.round((body.amount || 10000) * 0.015),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        quoteId: 'quote-' + Date.now(),
      }))
      .persist();

    // Mock deposit creation
    nock(yellowcardUrl)
      .post('/deposits')
      .reply(201, (uri, body: any) => ({
        depositId: 'dep-' + Date.now(),
        amount: body.amount,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 600.5,
        fee: Math.round(body.amount * 0.015),
        estimatedAmount: parseFloat((body.amount / 600.5).toFixed(2)),
        status: 'pending',
        paymentInstructions: {
          type: 'mobile_money',
          provider: body.channel,
          accountNumber: '+2250700000000',
          reference: 'DEP-' + Date.now(),
          instructions: `Send ${body.amount} XOF to the number above`,
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }))
      .persist();

    // Mock deposit status check
    nock(yellowcardUrl)
      .get(/\/deposits\/.*/)
      .reply(200, (uri) => {
        const depositId = uri.split('/').pop();
        return {
          depositId,
          status: 'pending',
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        };
      })
      .persist();

    // Mock Blnk ledger
    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, { balance_id: 'mock-balance-id', balance: 0 })
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/.*/)
      .reply(200, {
        balance_id: 'mock-balance-id',
        balance: 0,
        currency: 'USD',
      })
      .persist();

    nock(blnkUrl)
      .post('/transactions')
      .reply(201, (uri, body: any) => ({
        transaction_id: 'txn-' + Date.now(),
        amount: body.amount,
        status: 'applied',
      }))
      .persist();

    // Mock Circle wallet
    nock(circleUrl)
      .post('/v1/wallets')
      .reply(200, { data: { walletId: 'mock-wallet-id' } })
      .persist();

    nock(circleUrl)
      .get(/\/v1\/wallets\/.*\/balance/)
      .reply(200, {
        data: { available: [{ amount: '0.00', currency: 'USD' }] },
      })
      .persist();
  }

  describe('Get Deposit Channels', () => {
    it("should return available deposit channels for Cote d'Ivoire", async () => {
      const response = await request(app.getHttpServer())
        .get('/deposit/channels')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ country: 'CI' })
        .expect(200);

      expect(response.body).toHaveProperty('channels');
      expect(Array.isArray(response.body.channels)).toBe(true);
      expect(response.body.channels.length).toBeGreaterThan(0);

      const channel = response.body.channels[0];
      expect(channel).toHaveProperty('id');
      expect(channel).toHaveProperty('name');
      expect(channel).toHaveProperty('provider');
      expect(channel).toHaveProperty('minAmount');
      expect(channel).toHaveProperty('maxAmount');
      expect(channel).toHaveProperty('fee');
    });

    it('should filter channels by provider', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposit/channels')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ country: 'CI', provider: 'orange' })
        .expect(200);

      expect(
        response.body.channels.every((c: any) => c.provider === 'orange'),
      ).toBe(true);
    });
  });

  describe('Get Rate Quote', () => {
    it('should return rate quote for XOF to USDC', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      expect(response.body).toHaveProperty('rate');
      expect(response.body).toHaveProperty('sourceAmount', 10000);
      expect(response.body).toHaveProperty('targetAmount');
      expect(response.body).toHaveProperty('fee');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('quoteId');

      // Verify rate is reasonable (around 600 XOF per USD)
      expect(response.body.rate).toBeGreaterThan(500);
      expect(response.body.rate).toBeLessThan(700);
    });

    it('should calculate fees correctly', async () => {
      const amount = 50000;
      const response = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      // Fee should be 1.5% of amount
      const expectedFee = Math.round(amount * 0.015);
      expect(response.body.fee).toBe(expectedFee);
    });

    it('should reject amount below minimum', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 100, // Below minimum
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        });

      expect(response.status).toBe(400);
    });

    it('should reject amount above maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000000, // Above maximum
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Initiate Deposit', () => {
    it('should create deposit and return payment instructions', async () => {
      // Get quote first
      const quoteResponse = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      // Initiate deposit
      const response = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quoteId: quoteResponse.body.quoteId,
          channel: 'orange_money_ci',
          amount: 10000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('depositId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('paymentInstructions');
      expect(response.body.paymentInstructions).toHaveProperty('reference');
      expect(response.body.paymentInstructions).toHaveProperty('accountNumber');
      expect(response.body.paymentInstructions).toHaveProperty('instructions');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/deposit/initiate')
        .send({
          channel: 'orange_money_ci',
          amount: 10000,
        })
        .expect(401);
    });

    it('should validate channel', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          channel: 'invalid_channel',
          amount: 10000,
        });

      expect(response.status).toBe(400);
    });

    it('should validate amount against channel limits', async () => {
      // Amount below minimum
      const response = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          channel: 'orange_money_ci',
          amount: 100, // Below minimum
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Deposit Status', () => {
    let depositId: string;

    beforeEach(async () => {
      // Create a deposit
      const quoteResponse = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      const depositResponse = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quoteId: quoteResponse.body.quoteId,
          channel: 'orange_money_ci',
          amount: 10000,
        })
        .expect(201);

      depositId = depositResponse.body.depositId;
    });

    it('should return deposit status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/deposit/${depositId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('depositId', depositId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('amount');
    });

    it('should not allow accessing other user deposits', async () => {
      // Create another user
      const phone2 = '+2250700000002';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: phone2, countryCode: 'CI' })
        .expect(201);

      const verify2 = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: phone2, otp: '123456' })
        .expect(200);

      // Try to access first user's deposit
      await request(app.getHttpServer())
        .get(`/deposit/${depositId}`)
        .set('Authorization', `Bearer ${verify2.body.accessToken}`)
        .expect(404);
    });
  });

  describe('Deposit Webhook Processing', () => {
    let depositId: string;

    beforeEach(async () => {
      // Create a deposit
      const quoteResponse = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      const depositResponse = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quoteId: quoteResponse.body.quoteId,
          channel: 'orange_money_ci',
          amount: 10000,
        })
        .expect(201);

      depositId = depositResponse.body.depositId;
    });

    it('should process successful deposit webhook', async () => {
      const webhookPayload = {
        event: 'deposit.completed',
        data: {
          depositId,
          status: 'completed',
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
          actualAmount: 16.65,
          completedAt: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/webhook/yellowcard')
        .set('X-Webhook-Signature', 'valid-signature') // Mock signature
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify deposit status updated
      const statusResponse = await request(app.getHttpServer())
        .get(`/deposit/${depositId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('completed');
    });

    it('should process failed deposit webhook', async () => {
      const webhookPayload = {
        event: 'deposit.failed',
        data: {
          depositId,
          status: 'failed',
          failureReason: 'Payment timeout',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/webhook/yellowcard')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        event: 'deposit.completed',
        data: { depositId },
      };

      await request(app.getHttpServer())
        .post('/webhook/yellowcard')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(401);
    });
  });

  describe('Deposit History', () => {
    beforeEach(async () => {
      // Create multiple deposits
      for (let i = 0; i < 3; i++) {
        const quoteResponse = await request(app.getHttpServer())
          .post('/deposit/quote')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 10000 * (i + 1),
            sourceCurrency: 'XOF',
            targetCurrency: 'USD',
          })
          .expect(200);

        await request(app.getHttpServer())
          .post('/deposit/initiate')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            quoteId: quoteResponse.body.quoteId,
            channel: 'orange_money_ci',
            amount: 10000 * (i + 1),
          })
          .expect(201);
      }
    });

    it('should return deposit history', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposit/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('deposits');
      expect(Array.isArray(response.body.deposits)).toBe(true);
      expect(response.body.deposits.length).toBe(3);
    });

    it('should paginate deposit history', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposit/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.deposits.length).toBe(2);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total', 3);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposit/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ status: 'pending' })
        .expect(200);

      expect(
        response.body.deposits.every((d: any) => d.status === 'pending'),
      ).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get('/deposit/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body).toHaveProperty('deposits');
    });
  });

  describe('Deposit Cancellation', () => {
    let depositId: string;

    beforeEach(async () => {
      const quoteResponse = await request(app.getHttpServer())
        .post('/deposit/quote')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
        })
        .expect(200);

      const depositResponse = await request(app.getHttpServer())
        .post('/deposit/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quoteId: quoteResponse.body.quoteId,
          channel: 'orange_money_ci',
          amount: 10000,
        })
        .expect(201);

      depositId = depositResponse.body.depositId;
    });

    it('should cancel pending deposit', async () => {
      const response = await request(app.getHttpServer())
        .post(`/deposit/${depositId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'cancelled');
    });

    it('should not cancel completed deposit', async () => {
      // Simulate completion via webhook
      await request(app.getHttpServer())
        .post('/webhook/yellowcard')
        .set('X-Webhook-Signature', 'valid-signature')
        .send({
          event: 'deposit.completed',
          data: {
            depositId,
            status: 'completed',
            actualAmount: 16.65,
          },
        })
        .expect(200);

      // Attempt to cancel
      const response = await request(app.getHttpServer())
        .post(`/deposit/${depositId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });
  });
});
