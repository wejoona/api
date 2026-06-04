import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import nock from 'nock';
import { ensureDatabaseSchemas } from '../e2e/database-schemas';
import {
  startPostgresTestContainer,
  startRedisTestContainer,
} from '../e2e/testcontainers';

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
  const ledgerBalances = new Map<string, number>();

  jest.setTimeout(120000);

  beforeAll(async () => {
    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    postgresContainer = await startPostgresTestContainer();

    // Start Redis container
    console.log('Starting Redis container...');
    redisContainer = await startRedisTestContainer();

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
    process.env.YELLOW_CARD_ENABLED = 'true';
    process.env.YELLOW_CARD_USE_MOCK = 'true';

    // Disable external notifications
    process.env.NOTIFICATION_ENABLED = 'false';

    // Setup nock
    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);

    setupExternalApiMocks();

    await ensureDatabaseSchemas();

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

    await new Promise((resolve) => setTimeout(resolve, 250));

    nock.cleanAll();
    nock.enableNetConnect();

    if (app) {
      await app.close().catch((error) => {
        if (
          !(error instanceof Error) ||
          !error.message.includes('Connection is closed')
        ) {
          throw error;
        }
      });
    }

    if (dataSource?.isInitialized) {
      await dataSource.destroy();
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

    await dataSource.query(
      `UPDATE auth.users SET kyc_status = 'approved' WHERE id = $1`,
      [senderUserId],
    );

    await request(app.getHttpServer())
      .post('/wallet/create')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(201);

    // Set sender PIN
    await request(app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ pin: '6829', confirmPin: '6829' })
      .expect(200);

    const senderPinResponse = await request(app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ pin: '6829' })
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

    await dataSource.query(
      `UPDATE auth.users SET kyc_status = 'approved' WHERE id = $1`,
      [recipientUserId],
    );

    await request(app.getHttpServer())
      .post('/wallet/create')
      .set('Authorization', `Bearer ${recipientToken}`)
      .expect(201);

    await dataSource.query(
      `UPDATE wallets SET kyc_status = 'approved' WHERE user_id = ANY($1::uuid[])`,
      [[senderUserId, recipientUserId]],
    );

    // Set recipient username
    await request(app.getHttpServer())
      .put('/user/profile')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ username: recipientUsername })
      .expect(200);
  }

  async function seedWalletBalance(userId: string, amount: number) {
    ledgerBalances.set(userId, amount);

    // Mirror a completed deposit into the local wallet/transaction tables.
    await dataSource.query(
      `
      WITH wallet AS (
        UPDATE wallets
        SET balance = $2
        WHERE user_id = $1
        RETURNING id
      )
      INSERT INTO transactions (
        id, wallet_id, type, status, amount, currency,
        metadata, created_at, completed_at
      )
      SELECT
        gen_random_uuid(), id, 'deposit', 'completed', $2, 'USDC',
        '{"source": "test_seed"}', NOW(), NOW()
      FROM wallet
    `,
      [userId, amount],
    );
  }

  function getUsdcAvailable(responseBody: any): number {
    const balance = responseBody.balances.find(
      (item: any) => item.currency === 'USDC',
    );
    return balance?.available ?? 0;
  }

  async function getTransactionRow(transactionId: string) {
    const rows = await dataSource.query(
      `
      SELECT id, wallet_id, recipient_wallet_id, type, status, amount, currency,
             metadata, failure_reason, completed_at
      FROM transactions
      WHERE id = $1
      `,
      [transactionId],
    );

    return rows[0];
  }

  function setupExternalApiMocks() {
    const blnkUrl = process.env.BLNK_API_URL;
    const circleUrl = process.env.CIRCLE_API_URL;

    const getUserIdFromBalanceId = (balanceId: string) => {
      const match = balanceId.match(/^user-(.+)-usdc$/i);
      return match?.[1];
    };

    const blnkBalanceResponse = (uri: string) => {
      const balanceId = uri.split('/').pop() ?? 'mock-balance-id';
      const userId = getUserIdFromBalanceId(balanceId);
      const balance = userId ? ledgerBalances.get(userId) ?? 0 : 0;
      const microBalance = Math.round(balance * 1_000_000);

      return {
        balance_id: balanceId,
        balance: microBalance,
        credit_balance: microBalance,
        debit_balance: 0,
        inflight_balance: 0,
        inflight_credit_balance: 0,
        inflight_debit_balance: 0,
        currency: 'USDC',
        ledger_id: 'mock-ledger-id',
        precision: 1_000_000,
        created_at: new Date().toISOString(),
      };
    };

    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, { balance_id: 'mock-balance-id', balance: 0 })
      .persist();

    nock(blnkUrl)
      .post('/identities')
      .reply(201, {
        identity_id: 'mock-identity-id',
        identity_type: 'individual',
        first_name: 'Korido',
        last_name: 'Customer',
        email_address: null,
        phone_number: '+2250700000000',
        country: 'CI',
        created_at: new Date().toISOString(),
        meta_data: {},
      })
      .persist();

    nock(blnkUrl)
      .post('/reconciliation/matching-rules')
      .reply(201, {
        rule_id: 'mock-matching-rule-id',
        created_at: new Date().toISOString(),
      })
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/.*/)
      .reply(200, (uri) => blnkBalanceResponse(uri))
      .persist();

    // Mock Blnk transactions
    nock(blnkUrl)
      .post('/transactions')
      .reply(function (_uri, body: any) {
        const sourceUserId = getUserIdFromBalanceId(body.source);
        const destinationUserId = getUserIdFromBalanceId(body.destination);
        const amount = Number(body.amount) || 0;

        if (sourceUserId) {
          const sourceBalance = ledgerBalances.get(sourceUserId) ?? 0;
          if (!body.allow_overdraft && sourceBalance < amount) {
            return [
              400,
              {
                error: 'insufficient_balance',
                message: 'Insufficient balance',
              },
            ];
          }
          ledgerBalances.set(
            sourceUserId,
            sourceBalance - amount,
          );
        }
        if (destinationUserId) {
          ledgerBalances.set(
            destinationUserId,
            (ledgerBalances.get(destinationUserId) ?? 0) + amount,
          );
        }

        return [201, {
          transaction_id: 'txn-' + Date.now(),
          source: body.source,
          destination: body.destination,
          reference: body.reference,
          amount: body.amount,
          precise_amount: Math.round(amount * 1_000_000),
          precision: 1_000_000,
          currency: body.currency || 'USDC',
          description: body.description,
          status: 'APPLIED',
          created_at: new Date().toISOString(),
          meta_data: body.meta_data,
        }];
      })
      .persist();

    nock(blnkUrl)
      .put(/\/transactions\/inflight\/.*/)
      .reply(200, (uri, body: any) => ({
        transaction_id: uri.split('/').pop(),
        status: body.status === 'void' ? 'VOID' : 'COMMIT',
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
          toPhone: recipientPhone,
          amount: 10,
          note: 'Test transfer',
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('amount', 10);
      expect(response.body).toHaveProperty('amountDecimal', '10.000000');
      expect(response.body).toHaveProperty('fee', 0);
      expect(response.body).toHaveProperty('feeDecimal', '0.000000');
      expect(response.body).toHaveProperty('toPhone', recipientPhone);

      const persisted = await getTransactionRow(response.body.transactionId);
      expect(persisted).toEqual(
        expect.objectContaining({
          id: response.body.transactionId,
          type: 'transfer_internal',
          status: 'completed',
          currency: 'USDC',
        }),
      );
      expect(Number(persisted.amount)).toBe(-10);
      expect(persisted.completed_at).toBeTruthy();
      expect(persisted.metadata).toEqual(
        expect.objectContaining({
          direction: 'outbound',
          recipientName: expect.any(String),
          omnibusPattern: true,
        }),
      );
    });

    it('should require PIN token', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          toPhone: recipientPhone,
          amount: 10,
        })
        .expect(400);
    });

    it('should reject invalid PIN token', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', 'invalid-pin-token')
        .send({
          toPhone: recipientPhone,
          amount: 10,
        })
        .expect(403);
    });

    it('should reject transfer to non-existent phone', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          toPhone: '+2250799999999',
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
          toPhone: '+2250700000001', // Sender's own phone
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
          toPhone: recipientPhone,
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
          toPhone: recipientPhone,
          amount: 0,
        })
        .expect(400);

      // Negative amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          toPhone: recipientPhone,
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
          amount: 10,
          note: 'Payment via username',
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('amount', 10);
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
        .expect(200);

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
    const validPolygonAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb0';

    it('should initiate external transfer to valid address', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          address: validPolygonAddress,
          amount: 10,
          network: 'polygon',
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('amount', 10);
      expect(response.body).toHaveProperty('amountDecimal', '10.000000');
      expect(response.body).toHaveProperty('fee');
      expect(response.body).toHaveProperty('feeDecimal');
      expect(response.body).toHaveProperty('recipientAddress', validPolygonAddress);
      expect(response.body).toHaveProperty('network', 'polygon');

      const persisted = await getTransactionRow(response.body.transactionId);
      expect(persisted).toEqual(
        expect.objectContaining({
          id: response.body.transactionId,
          type: 'transfer_external',
          status: 'completed',
          currency: 'USDC',
        }),
      );
      expect(Number(persisted.amount)).toBeLessThan(-10);
      expect(persisted.metadata).toEqual(
        expect.objectContaining({
          network: 'polygon',
          grossAmount: 10,
          status: 'completed',
          blnkTransactionId: expect.any(String),
          omnibusNetwork: expect.any(String),
        }),
      );
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
        .get('/wallet/transfer/external/estimate-fee')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({
          amount: 100,
          network: 'polygon',
        })
        .expect(200);

      expect(response.body).toHaveProperty('network', 'polygon');
      expect(response.body).toHaveProperty('estimatedFee');
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
          toPhone: recipientPhone,
          amount: 100000, // Exceeds per-transaction limit
        })
        .expect(400);
    });

    it('should return user transfer limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/limits')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dailyLimit');
      expect(response.body).toHaveProperty('monthlyLimit');
      expect(response.body).toHaveProperty('singleTransactionLimit');
      expect(response.body).toHaveProperty('dailyUsed');
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
          toPhone: recipientPhone,
          amount: 20,
        })
        .expect(200);

      // Check updated limits
      const updatedLimits = await request(app.getHttpServer())
        .get('/wallet/limits')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(updatedLimits.body.dailyUsed).toBeGreaterThan(
        initialLimits.body.dailyUsed,
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
            toPhone: recipientPhone,
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
        .query({ offset: 0, limit: 3 })
        .expect(200);

      expect(response.body.transactions.length).toBeLessThanOrEqual(3);
      expect(response.body).toHaveProperty('limit', 3);
      expect(response.body).toHaveProperty('offset', 0);
    });

    it('should filter by transaction type', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({ type: 'transfer_internal' })
        .expect(200);

      expect(
        response.body.transactions.every(
          (t: any) => t.type === 'transfer_internal',
        ),
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
      const transferResponse = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          toPhone: recipientPhone,
          amount: 8,
          note: 'Transaction detail lookup',
        })
        .expect(200);

      const transactionId = transferResponse.body.transactionId;

      // Get transaction details
      const detailResponse = await request(app.getHttpServer())
        .get(`/wallet/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(detailResponse.body).toHaveProperty('id', transactionId);
      expect(detailResponse.body).toHaveProperty('type', 'transfer_internal');
      expect(detailResponse.body).toHaveProperty('amount', -8);
      expect(detailResponse.body).toHaveProperty('amountDecimal', '-8.000000');
      expect(detailResponse.body).toHaveProperty('status', 'completed');
      expect(detailResponse.body).toHaveProperty('createdAt');
      expect(detailResponse.body).toHaveProperty('completedAt');
      expect(detailResponse.body.metadata).toEqual(
        expect.objectContaining({
          direction: 'outbound',
          recipientName: expect.any(String),
          omnibusPattern: true,
        }),
      );
    });

    it('should expose empty, funded, pending, failed, and completed transaction states', async () => {
      const emptyPhone = '+2250700000999';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: emptyPhone, countryCode: 'CI' })
        .expect(201);

      const emptyVerify = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: emptyPhone, otp: '123456' })
        .expect(200);

      const emptyToken = emptyVerify.body.accessToken;

      await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${emptyToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              transactions: [],
              total: 0,
              hasMore: false,
            }),
          );
        });

      const completedTransfer = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          toPhone: recipientPhone,
          amount: 7,
          note: 'State coverage completed transfer',
        })
        .expect(200);

      const senderWallet = await dataSource.query(
        `SELECT id FROM wallets WHERE user_id = $1`,
        [senderUserId],
      );
      expect(senderWallet).toHaveLength(1);

      const pendingId = '11111111-1111-4111-8111-111111111111';
      const failedId = '22222222-2222-4222-8222-222222222222';

      await dataSource.query(
        `
        INSERT INTO transactions (
          id, wallet_id, type, status, amount, currency, metadata,
          failure_reason, created_at, completed_at
        )
        VALUES
          ($1, $3, 'transfer_external', 'pending', -12.34, 'USDC',
           '{"network":"polygon","grossAmount":12.34,"fee":0.07}'::jsonb,
           NULL, NOW(), NULL),
          ($2, $3, 'transfer_external', 'failed', -5.00, 'USDC',
           '{"network":"polygon","grossAmount":5,"fee":0.03}'::jsonb,
           'Provider timeout', NOW(), NOW())
        `,
        [pendingId, failedId, senderWallet[0].id],
      );

      const history = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .query({ limit: 50 })
        .expect(200);

      const states = new Map(
        history.body.transactions.map((transaction: any) => [
          transaction.id,
          transaction,
        ]),
      );

      expect(states.get(completedTransfer.body.transactionId)).toEqual(
        expect.objectContaining({
          status: 'completed',
          amountDecimal: '-7.000000',
        }),
      );
      expect(states.get(pendingId)).toEqual(
        expect.objectContaining({
          status: 'pending',
          amountDecimal: '-12.340000',
        }),
      );
      expect(states.get(failedId)).toEqual(
        expect.objectContaining({
          status: 'failed',
          amountDecimal: '-5.000000',
          failureReason: 'Provider timeout',
        }),
      );

      const fundedBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(fundedBalance.body).toMatchObject({
        currency: 'USDC',
        source: expect.stringMatching(/^(ledger|local_mirror)$/),
      });
      expect(fundedBalance.body.balances).toHaveLength(1);
      expect(fundedBalance.body.balances[0].currency).toBe('USDC');
      expect(getUsdcAvailable(fundedBalance.body)).toBeGreaterThan(0);
      expect(fundedBalance.body.balances[0]).toEqual(
        expect.objectContaining({
          availableDecimal: expect.any(String),
          pendingDecimal: expect.any(String),
          totalDecimal: expect.any(String),
        }),
      );
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
        .expect(403);
    });
  });

  describe('Balance Management', () => {
    it('should return wallet balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balances');
      expect(response.body).toMatchObject({
        currency: 'USDC',
        source: expect.stringMatching(/^(ledger|local_mirror)$/),
      });
      expect(response.body.balances).toHaveLength(1);
      expect(response.body.balances[0].currency).toBe('USDC');
      expect(typeof getUsdcAvailable(response.body)).toBe('number');
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
          toPhone: recipientPhone,
          amount: 10,
        })
        .expect(200);

      // Check updated balance
      const updatedBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(getUsdcAvailable(updatedBalance.body)).toBeLessThan(
        getUsdcAvailable(initialBalance.body),
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
          toPhone: recipientPhone,
          amount: 15,
        })
        .expect(200);

      // Check recipient's updated balance
      const updatedBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(200);

      expect(getUsdcAvailable(updatedBalance.body)).toBeGreaterThan(
        getUsdcAvailable(initialBalance.body),
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
              toPhone: recipientPhone,
              amount: 10,
              note: `Concurrent transfer ${i + 1}`,
            }),
        );

      const results = await Promise.allSettled(transfers);

      // All should succeed
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200,
      );
      expect(successful.length).toBe(5);
    });

    it('should prevent double spending', async () => {
      // Get current balance
      const balanceResponse = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const currentBalance = getUsdcAvailable(balanceResponse.body);

      // Try to transfer more than balance with concurrent requests
      const transfers = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/wallet/transfer/internal')
            .set('Authorization', `Bearer ${senderToken}`)
            .set('X-Pin-Token', senderPinToken)
            .send({
              toPhone: recipientPhone,
              amount: currentBalance / 2,
              note: `Double spend attempt ${i + 1}`,
            }),
        );

      const results = await Promise.allSettled(transfers);

      // Only some should succeed (not more than what balance allows)
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200,
      );

      // At most 2 should succeed
      expect(successful.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Transfer Notifications', () => {
    it('should include notification preference check', async () => {
      await seedWalletBalance(senderUserId, 1000);

      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Pin-Token', senderPinToken)
        .send({
          toPhone: recipientPhone,
          amount: 5,
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionId');
      // In test env, notifications are disabled but the flow should complete
    });
  });
});
