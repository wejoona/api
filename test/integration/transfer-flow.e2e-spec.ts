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
 * Transfer Flow Integration Tests
 *
 * Tests the complete transfer journeys:
 * 1. Internal P2P transfers (phone to phone)
 * 2. Internal username transfers
 * 3. External blockchain transfers
 * 4. Transfer limits and validation
 * 5. Transaction history
 *
 * Uses testcontainers for PostgreSQL and Redis isolation.
 */
describe('Transfer Flow (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let dataSource: DataSource;

  // Test users
  let senderToken: string;
  let senderUserId: string;
  let senderPinToken: string;

  let recipientToken: string;
  let recipientUserId: string;
  let recipientPhone: string;
  let recipientUsername: string;

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

    // Create test users
    await setupTestUsers();

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

  async function setupTestUsers() {
    // Create sender
    const senderPhone = '+2250700000001';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: senderPhone, countryCode: 'CI' })
      .expect(201);

    const senderVerify = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone: senderPhone, otp: '123456' })
      .expect(200);

    senderToken = senderVerify.body.accessToken;
    senderUserId = senderVerify.body.user.id;

    // Set sender PIN
    await request(app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ pin: '1234', confirmPin: '1234' })
      .expect(200);

    const senderPinResponse = await request(app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ pin: '1234' })
      .expect(200);

    senderPinToken = senderPinResponse.body.pinToken;

    // Fund sender wallet (mock balance)
    await seedWalletBalance(senderUserId, 1000);

    // Create recipient
    recipientPhone = '+2250700000002';
    recipientUsername = 'recipient_user';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: recipientPhone, countryCode: 'CI' })
      .expect(201);

    const recipientVerify = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone: recipientPhone, otp: '123456' })
      .expect(200);

    recipientToken = recipientVerify.body.accessToken;
    recipientUserId = recipientVerify.body.user.id;

    // Set recipient username
    await request(app.getHttpServer())
      .put('/user/profile')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ username: recipientUsername })
      .expect(200);
  }

  async function seedWalletBalance(userId: string, amount: number) {
    // Insert mock deposit transaction to simulate funded wallet
    await dataSource.query(
      `
      INSERT INTO transactions (
        id, user_id, type, status, amount, currency,
        metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'deposit', 'completed', $2, 'USDC',
        '{"source": "test_seed"}', NOW(), NOW()
      )
    `,
      [userId, amount],
    );
  }

  function setupExternalApiMocks() {
    const blnkUrl = process.env.BLNK_API_URL;
    const circleUrl = process.env.CIRCLE_API_URL;

    // Mock Blnk balance queries with dynamic balances
    let senderBalance = 1000;

    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, { balance_id: 'mock-balance-id', balance: 0 })
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/sender.*/)
      .reply(200, () => ({
        balance_id: 'sender-balance-id',
        balance: senderBalance * 100, // cents
        currency: 'USD',
      }))
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/recipient.*/)
      .reply(200, {
        balance_id: 'recipient-balance-id',
        balance: 0,
        currency: 'USD',
      })
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/.*/)
      .reply(200, {
        balance_id: 'mock-balance-id',
        balance: 100000,
        currency: 'USD',
      })
      .persist();

    // Mock Blnk transactions
    nock(blnkUrl)
      .post('/transactions')
      .reply(201, (uri, body: any) => {
        senderBalance -= body.amount / 100;
        return {
          transaction_id: 'txn-' + Date.now(),
          amount: body.amount,
          status: 'applied',
        };
      })
      .persist();

    // Mock Circle wallet
    nock(circleUrl)
      .post('/v1/wallets')
      .reply(200, { data: { walletId: 'mock-wallet-id' } })
      .persist();

    nock(circleUrl)
      .get(/\/v1\/wallets\/.*\/balance/)
      .reply(200, {
        data: { available: [{ amount: '1000.00', currency: 'USD' }] },
      })
      .persist();

    // Mock Circle blockchain transfer
    nock(circleUrl)
      .post('/v1/transfers/blockchain')
      .reply(200, (uri, body: any) => ({
        data: {
          id: 'mock-blockchain-transfer-id',
          source: { type: 'wallet', id: 'source-wallet' },
          destination: {
            type: 'blockchain',
            address: body.destination?.address,
            chain: body.destination?.chain,
          },
          amount: body.amount,
          transactionHash: '0x' + 'a'.repeat(64),
          status: 'pending',
        },
      }))
      .persist();

    // Mock Circle transfer status
    nock(circleUrl)
      .get(/\/v1\/transfers\/.*/)
      .reply(200, {
        data: {
          id: 'mock-transfer-id',
          status: 'complete',
        },
      })
      .persist();
  }

  describe('Internal P2P Transfer (Phone)', () => {
    it('should complete transfer to phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 50,
          note: 'Test transfer',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('amount', 50);
      expect(response.body).toHaveProperty('recipientPhone', recipientPhone);
    });

    it('should require PIN token', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipientPhone,
          amount: 10,
        })
        .expect(401);
    });

    it('should reject invalid PIN token', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', 'invalid-pin-token')
        .send({
          recipientPhone,
          amount: 10,
        })
        .expect(401);
    });

    it('should reject transfer to non-existent phone', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone: '+2250799999999',
          amount: 10,
        });

      expect(response.status).toBe(404);
    });

    it('should reject self-transfer', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone: '+2250700000001', // Sender's own phone
          amount: 10,
        });

      expect(response.status).toBe(400);
    });

    it('should reject insufficient balance', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 100000, // More than balance
        });

      expect(response.status).toBe(400);
    });

    it('should validate amount', async () => {
      // Zero amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 0,
        })
        .expect(400);

      // Negative amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: -10,
        })
        .expect(400);
    });
  });

  describe('Internal P2P Transfer (Username)', () => {
    it('should complete transfer to username', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientUsername,
          amount: 25,
          note: 'Payment via username',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('amount', 25);
    });

    it('should handle @username format', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientUsername: `@${recipientUsername}`,
          amount: 15,
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'completed');
    });

    it('should reject transfer to non-existent username', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientUsername: 'nonexistent_user',
          amount: 10,
        })
        .expect(404);
    });
  });

  describe('External Blockchain Transfer', () => {
    const validPolygonAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

    it('should initiate external transfer to valid address', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          address: validPolygonAddress,
          amount: 100,
          network: 'polygon',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('address', validPolygonAddress);
      expect(response.body).toHaveProperty('network', 'polygon');
    });

    it('should reject invalid blockchain address', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          address: '0xinvalid',
          amount: 50,
          network: 'polygon',
        })
        .expect(400);
    });

    it('should reject unsupported network', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          address: validPolygonAddress,
          amount: 50,
          network: 'unsupported_network',
        })
        .expect(400);
    });

    it('should enforce minimum external transfer amount', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          address: validPolygonAddress,
          amount: 0.001, // Below minimum
          network: 'polygon',
        })
        .expect(400);
    });

    it('should include network fee estimate', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/external/quote')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          address: validPolygonAddress,
          amount: 100,
          network: 'polygon',
        })
        .expect(200);

      expect(response.body).toHaveProperty('amount', 100);
      expect(response.body).toHaveProperty('networkFee');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('estimatedTime');
    });
  });

  describe('Transfer Limits', () => {
    it('should enforce per-transaction limit', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 100000, // Exceeds per-transaction limit
        })
        .expect(400);
    });

    it('should return user transfer limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/limits')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('daily');
      expect(response.body).toHaveProperty('weekly');
      expect(response.body).toHaveProperty('monthly');
      expect(response.body).toHaveProperty('perTransaction');
      expect(response.body).toHaveProperty('remaining');
    });

    it('should track daily limit usage', async () => {
      // Get initial limits
      const initialLimits = await request(app.getHttpServer())
        .get('/wallet/limits')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      // Make a transfer
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 20,
        })
        .expect(201);

      // Check updated limits
      const updatedLimits = await request(app.getHttpServer())
        .get('/wallet/limits')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(updatedLimits.body.remaining.daily).toBeLessThan(
        initialLimits.body.remaining.daily,
      );
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      // Make some test transfers
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/wallet/transfer/internal')
          .set('Authorization', `Bearer ${senderToken}`)
          .set('X-Pin-Token', senderPinToken)
          .send({
            recipientPhone,
            amount: 5 + i,
            note: `Transfer ${i + 1}`,
          });
      }
    });

    it('should return transaction history', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    it('should paginate transaction history', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.transactions.length).toBeLessThanOrEqual(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 3);
    });

    it('should filter by transaction type', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({ type: 'transfer' })
        .expect(200);

      expect(
        response.body.transactions.every((t: any) => t.type === 'transfer'),
      ).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
    });

    it('should return transaction details', async () => {
      // Get transaction list first
      const listResponse = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const transactionId = listResponse.body.transactions[0].id;

      // Get transaction details
      const detailResponse = await request(app.getHttpServer())
        .get(`/wallet/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(detailResponse.body).toHaveProperty('id', transactionId);
      expect(detailResponse.body).toHaveProperty('type');
      expect(detailResponse.body).toHaveProperty('amount');
      expect(detailResponse.body).toHaveProperty('status');
      expect(detailResponse.body).toHaveProperty('createdAt');
    });

    it('should not return other user transactions', async () => {
      // Get sender's transactions
      const senderTxList = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const senderTxId = senderTxList.body.transactions[0].id;

      // Recipient should not see sender's transaction details
      await request(app.getHttpServer())
        .get(`/wallet/transactions/${senderTxId}`)
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(404);
    });
  });

  describe('Balance Management', () => {
    it('should return wallet balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('currency', 'USDC');
      expect(typeof response.body.balance).toBe('number');
    });

    it('should update balance after transfer', async () => {
      // Get initial balance
      const initialBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      // Make transfer
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 10,
        })
        .expect(201);

      // Check updated balance
      const updatedBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(updatedBalance.body.balance).toBeLessThan(
        initialBalance.body.balance,
      );
    });

    it('should update recipient balance after transfer', async () => {
      // Get initial recipient balance
      const initialBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(200);

      // Sender makes transfer
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 15,
        })
        .expect(201);

      // Check recipient's updated balance
      const updatedBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(200);

      expect(updatedBalance.body.balance).toBeGreaterThan(
        initialBalance.body.balance,
      );
    });
  });

  describe('Concurrent Transfers', () => {
    it('should handle concurrent transfers correctly', async () => {
      // Fund sender wallet more
      await seedWalletBalance(senderUserId, 500);

      // Create multiple concurrent transfers
      const transfers = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/wallet/transfer/internal')
            .set('Authorization', `Bearer ${senderToken}`)
            .set('X-Pin-Token', senderPinToken)
            .send({
              recipientPhone,
              amount: 10,
              note: `Concurrent transfer ${i + 1}`,
            }),
        );

      const results = await Promise.allSettled(transfers);

      // All should succeed
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      expect(successful.length).toBe(5);
    });

    it('should prevent double spending', async () => {
      // Get current balance
      const balanceResponse = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const currentBalance = balanceResponse.body.balance;

      // Try to transfer more than balance with concurrent requests
      const transfers = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/wallet/transfer/internal')
            .set('Authorization', `Bearer ${senderToken}`)
            .set('X-Pin-Token', senderPinToken)
            .send({
              recipientPhone,
              amount: currentBalance / 2,
              note: `Double spend attempt ${i + 1}`,
            }),
        );

      const results = await Promise.allSettled(transfers);

      // Only some should succeed (not more than what balance allows)
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );

      // At most 2 should succeed
      expect(successful.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Transfer Notifications', () => {
    it('should include notification preference check', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          recipientPhone,
          amount: 5,
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      // In test env, notifications are disabled but the flow should complete
    });
  });
});
