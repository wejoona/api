import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID, createHmac } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import nock from 'nock';
import { DepositEntity } from '../../src/modules/deposit/domain/entities/deposit.entity';
import { ensureDatabaseSchemas } from '../e2e/database-schemas';
import {
  startPostgresTestContainer,
  startRedisTestContainer,
} from '../e2e/testcontainers';

describe('Deposit Flow (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let dataSource: DataSource;

  let accessToken: string;

  const testPhone = '+2250700000001';
  const webhookSecret = 'test-webhook-secret';

  jest.setTimeout(120000);

  beforeAll(async () => {
    postgresContainer = await startPostgresTestContainer();

    redisContainer = await startRedisTestContainer();

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

    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-for-integration-tests';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    process.env.RATE_LIMIT_TTL = '60';
    process.env.RATE_LIMIT_LIMIT = '1000';

    process.env.YELLOW_CARD_ENABLED = 'true';
    process.env.YELLOW_CARD_USE_MOCK = 'true';
    process.env.DEPOSIT_USE_MOCK = 'true';
    process.env.YELLOWCARD_API_URL = 'http://localhost:3999/yellowcard';
    process.env.BLNK_API_URL = 'http://localhost:3999/blnk';
    process.env.CIRCLE_API_URL = 'http://localhost:3999/circle';
    process.env.WEBHOOK_SECRET_OMCI = webhookSecret;
    process.env.NOTIFICATION_ENABLED = 'false';

    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
    setupExternalApiMocks();

    await ensureDatabaseSchemas();

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

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
    await setupTestUser();
  });

  afterAll(async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 250));

    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (postgresContainer) {
      await postgresContainer.stop();
    }

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  async function setupTestUser() {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: testPhone, countryCode: 'CI' })
      .expect(201);

    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone: testPhone, otp: '123456' })
      .expect(200);

    accessToken = verifyResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin: '6829', confirmPin: '6829' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin: '6829' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/wallet/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
  }

  function setupExternalApiMocks() {
    const blnkUrl = process.env.BLNK_API_URL;
    const circleUrl = process.env.CIRCLE_API_URL;

    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id', name: 'Test Ledger' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, {
        balance_id: 'mock-balance-id',
        ledger_id: 'mock-ledger-id',
        balance: 0,
        credit_balance: 0,
        debit_balance: 0,
        inflight_balance: 0,
        inflight_credit_balance: 0,
        inflight_debit_balance: 0,
        currency: 'USDC',
        precision: 1_000_000,
        created_at: new Date().toISOString(),
      })
      .persist();

    nock(blnkUrl)
      .post('/identities')
      .reply(201, {
        identity_id: 'mock-identity-id',
        identity_type: 'individual',
        first_name: 'Korido',
        last_name: 'Customer',
        email_address: null,
        phone_number: testPhone,
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
      .reply(200, (uri) => {
        const balanceId = uri.split('/').pop() ?? 'mock-balance-id';
        return {
          balance_id: balanceId,
          balance: 0,
          credit_balance: 0,
          debit_balance: 0,
          inflight_balance: 0,
          inflight_credit_balance: 0,
          inflight_debit_balance: 0,
          currency: 'USDC',
          ledger_id: 'mock-ledger-id',
          precision: 1_000_000,
          created_at: new Date().toISOString(),
        };
      })
      .persist();

    nock(blnkUrl)
      .post('/transactions')
      .reply(201, (_uri, body: any) => ({
        transaction_id: 'txn-' + Date.now(),
        source: body.source,
        destination: body.destination,
        reference: body.reference,
        amount: body.amount,
        precise_amount: Math.round(Number(body.amount || 0) * 1_000_000),
        precision: 1_000_000,
        currency: body.currency || 'USDC',
        description: body.description,
        status: 'APPLIED',
        created_at: new Date().toISOString(),
        meta_data: body.meta_data,
      }))
      .persist();

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

  async function initiateDeposit(amount = 10000, providerCode = 'OMCI') {
    const response = await request(app.getHttpServer())
      .post('/deposits/initiate')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount,
        currency: 'XOF',
        providerCode,
        phoneNumber: testPhone,
      })
      .expect(201);

    return response.body;
  }

  async function initiateWalletDeposit(amount = 10000) {
    const response = await request(app.getHttpServer())
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Idempotency-Key', randomUUID())
      .send({
        amount,
        sourceCurrency: 'XOF',
        channelId: 'orange_money_ci',
      })
      .expect(201);

    return response.body;
  }

  async function getDepositRecord(id: string): Promise<DepositEntity> {
    const record = await dataSource
      .getRepository(DepositEntity)
      .findOne({ where: { id } });

    if (!record) {
      throw new Error(`Deposit ${id} not found`);
    }

    return record;
  }

  function signWebhook(payload: Record<string, unknown>): string {
    return createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  describe('Providers and channels', () => {
    it("should return mobile money deposit providers for Cote d'Ivoire", async () => {
      const response = await request(app.getHttpServer())
        .get('/deposits/providers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'OMCI',
            name: expect.stringContaining('Orange'),
            supportedCurrencies: expect.arrayContaining(['XOF']),
          }),
        ]),
      );
    });

    it('should keep wallet channel compatibility for mobile clients', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/deposit/channels')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currency: 'XOF' })
        .expect(200);

      expect(response.body.channels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'orange_money_ci',
            provider: 'orange',
            currency: 'XOF',
          }),
        ]),
      );
    });
  });

  describe('Rate quote', () => {
    it('should return a wallet rate quote for XOF to USD', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ amount: 10000, sourceCurrency: 'XOF', targetCurrency: 'USD' })
        .expect(200);

      expect(response.body).toMatchObject({
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        sourceAmount: 10000,
      });
      expect(response.body.rate).toBeGreaterThan(0);
      expect(response.body.targetAmount).toBeGreaterThan(0);
      expect(response.body.fee).toBe(150);
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should reject invalid quote amounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ amount: 0, sourceCurrency: 'XOF', targetCurrency: 'USD' });

      expect(response.status).toBe(400);
    });
  });

  describe('Initiate deposit', () => {
    it('should create a mobile-money deposit and return payment instructions', async () => {
      const response = await initiateDeposit();

      expect(response).toEqual(
        expect.objectContaining({
          depositId: expect.any(String),
          token: expect.any(String),
          paymentMethodType: 'OTP',
          instructions: expect.any(String),
          expiresAt: expect.any(String),
        }),
      );
    });

    it('should keep wallet deposit compatibility for mobile clients', async () => {
      const response = await initiateWalletDeposit();

      expect(response).toEqual(
        expect.objectContaining({
          transactionId: expect.any(String),
          depositId: expect.any(String),
          amount: 10000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USDC',
          amountDecimal: '10000',
          rateDecimal: expect.any(String),
          feeDecimal: expect.any(String),
          estimatedAmountDecimal: expect.any(String),
          paymentInstructions: expect.objectContaining({
            reference: expect.any(String),
            instructions: expect.any(String),
          }),
        }),
      );

      const persisted = await dataSource.query(
        `
        SELECT t.id, t.type, t.status, t.amount, t.currency, t.metadata
        FROM transactions t
        WHERE t.id = $1
        `,
        [response.transactionId],
      );

      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toEqual(
        expect.objectContaining({
          id: response.transactionId,
          type: 'deposit',
          status: 'pending',
          currency: 'USDC',
        }),
      );
      expect(persisted[0].metadata).toEqual(
        expect.objectContaining({
          sourceCurrency: 'XOF',
          sourceAmount: 10000,
          channelId: 'orange_money_ci',
          depositId: response.depositId,
        }),
      );

      const detailResponse = await request(app.getHttpServer())
        .get(`/wallet/transactions/${response.transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(detailResponse.body).toEqual(
        expect.objectContaining({
          id: response.transactionId,
          type: 'deposit',
          status: 'pending',
          amountDecimal: expect.any(String),
          metadata: expect.objectContaining({
            sourceCurrency: 'XOF',
            sourceAmount: 10000,
            sourceAmountDecimal: '10000',
            rateDecimal: expect.any(String),
            feeDecimal: expect.any(String),
          }),
        }),
      );
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/deposits/initiate')
        .set('idempotency-key', randomUUID())
        .send({
          amount: 10000,
          currency: 'XOF',
          providerCode: 'OMCI',
          phoneNumber: testPhone,
        })
        .expect(401);
    });

    it('should validate provider code', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposits/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('idempotency-key', randomUUID())
        .send({
          amount: 10000,
          currency: 'XOF',
          providerCode: 'BAD',
          phoneNumber: testPhone,
        });

      expect(response.status).toBe(400);
    });

    it('should validate amount limits', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposits/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('idempotency-key', randomUUID())
        .send({
          amount: 50,
          currency: 'XOF',
          providerCode: 'OMCI',
          phoneNumber: testPhone,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Deposit status', () => {
    let depositId: string;

    beforeEach(async () => {
      const deposit = await initiateDeposit();
      depositId = deposit.depositId;
    });

    it('should return deposit status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/deposits/${depositId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: depositId,
          status: 'pending_otp',
          amount: 10000,
          currency: 'XOF',
          providerCode: 'OMCI',
        }),
      );
    });

    it('should not allow another user to access the deposit', async () => {
      const phone2 = '+2250700000002';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: phone2, countryCode: 'CI' })
        .expect(201);

      const verify2 = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: phone2, otp: '123456' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/deposits/${depositId}`)
        .set('Authorization', `Bearer ${verify2.body.accessToken}`)
        .expect(404);
    });
  });

  describe('Deposit confirmation', () => {
    it('should complete an OTP deposit', async () => {
      const deposit = await initiateDeposit();

      const response = await request(app.getHttpServer())
        .post('/deposits/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: deposit.token, otp: '123456' })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: deposit.depositId,
          status: 'completed',
          amount: 10000,
          currency: 'XOF',
        }),
      );
      expect(response.body.providerReference).toEqual(expect.any(String));
    });

    it('should reject an invalid confirmation token', async () => {
      const response = await request(app.getHttpServer())
        .post('/deposits/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: 'not-a-valid-token', otp: '123456' });

      expect(response.status).toBe(400);
    });
  });

  describe('Deposit webhooks', () => {
    it('should process a successful provider webhook', async () => {
      const deposit = await initiateDeposit();
      const record = await getDepositRecord(deposit.depositId);
      const payload = {
        providerTransactionId: record.providerTransactionId,
        status: 'completed',
        providerReference: 'om-webhook-ref',
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/deposit/OMCI')
        .set('X-Webhook-Signature', signWebhook(payload))
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({ status: 'ok', message: 'Processed' });

      const statusResponse = await request(app.getHttpServer())
        .get(`/deposits/${deposit.depositId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('completed');
    });

    it('should process a failed provider webhook', async () => {
      const deposit = await initiateDeposit();
      const record = await getDepositRecord(deposit.depositId);
      const payload = {
        providerTransactionId: record.providerTransactionId,
        status: 'failed',
        reason: 'Payment timeout',
      };

      await request(app.getHttpServer())
        .post('/webhooks/deposit/OMCI')
        .set('X-Webhook-Signature', signWebhook(payload))
        .send(payload)
        .expect(200);

      const statusResponse = await request(app.getHttpServer())
        .get(`/deposits/${deposit.depositId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body).toEqual(
        expect.objectContaining({
          status: 'failed',
          failureReason: 'Payment timeout',
        }),
      );
    });

    it('should reject a webhook with an invalid signature', async () => {
      const deposit = await initiateDeposit();
      const record = await getDepositRecord(deposit.depositId);
      const payload = {
        providerTransactionId: record.providerTransactionId,
        status: 'completed',
      };

      await request(app.getHttpServer())
        .post('/webhooks/deposit/OMCI')
        .set('X-Webhook-Signature', '0'.repeat(64))
        .send(payload)
        .expect(401);
    });
  });

  describe('Deposit history', () => {
    beforeEach(async () => {
      for (const amount of [10000, 20000, 30000]) {
        await initiateDeposit(amount);
      }
    });

    it('should return deposit history', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposits')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.deposits)).toBe(true);
      expect(response.body.deposits.length).toBeGreaterThanOrEqual(3);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should paginate deposit history', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposits')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.deposits.length).toBeLessThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(typeof response.body.hasMore).toBe('boolean');
    });

    it('should filter history by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/deposits')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ status: 'pending_otp' })
        .expect(200);

      expect(
        response.body.deposits.every(
          (deposit: any) => deposit.status === 'pending_otp',
        ),
      ).toBe(true);
    });
  });

  describe('Unsupported operations', () => {
    it('should not expose deposit cancellation before provider cancellation is implemented', async () => {
      const deposit = await initiateDeposit();

      await request(app.getHttpServer())
        .post(`/deposits/${deposit.depositId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
