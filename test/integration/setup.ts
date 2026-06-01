import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';
import { DataSource, EntityMetadata } from 'typeorm';
import nock from 'nock';
import { ensureDatabaseSchemas } from '../e2e/database-schemas';
import {
  startPostgresTestContainer,
  startRedisTestContainer,
} from '../e2e/testcontainers';

/**
 * Integration Test Setup
 *
 * Provides shared infrastructure for integration tests:
 * - PostgreSQL container
 * - Redis container
 * - NestJS application
 * - Database utilities
 * - External API mocking
 *
 * Usage:
 * ```typescript
 * let setup: IntegrationTestSetup;
 *
 * beforeAll(async () => {
 *   setup = new IntegrationTestSetup();
 *   await setup.init();
 * }, 120000);
 *
 * afterAll(async () => {
 *   await setup.teardown();
 * });
 *
 * beforeEach(async () => {
 *   await setup.cleanDatabase();
 * });
 * ```
 */
export class IntegrationTestSetup {
  app: INestApplication;
  postgresContainer: StartedPostgreSqlContainer;
  redisContainer: StartedTestContainer;
  dataSource: DataSource;

  /**
   * Initialize test infrastructure
   */
  async init(): Promise<INestApplication> {
    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    this.postgresContainer = await startPostgresTestContainer();

    // Start Redis container
    console.log('Starting Redis container...');
    this.redisContainer = await startRedisTestContainer();

    // Configure environment
    this.configureEnvironment();

    // Setup nock for external API mocking
    this.setupNock();
    await ensureDatabaseSchemas();

    // Create NestJS application
    console.log('Creating NestJS application...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.getHttpAdapter().getInstance().disable('x-powered-by');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await this.app.init();

    // Get DataSource and run migrations
    this.dataSource = this.app.get(DataSource);
    console.log('Running database migrations...');
    await this.dataSource.runMigrations();

    console.log('Integration test setup complete');
    return this.app;
  }

  /**
   * Configure environment variables
   */
  private configureEnvironment() {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = this.postgresContainer.getHost();
    process.env.DATABASE_PORT = this.postgresContainer.getPort().toString();
    process.env.DATABASE_NAME = 'test_db';
    process.env.DATABASE_USER = 'test_user';
    process.env.DATABASE_PASSWORD = 'test_password';
    process.env.REDIS_HOST = this.redisContainer.getHost();
    process.env.REDIS_PORT = this.redisContainer.getMappedPort(6379).toString();
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
  }

  /**
   * Setup nock for external API mocking
   */
  private setupNock() {
    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
  }

  /**
   * Teardown test infrastructure
   */
  async teardown() {
    console.log('Tearing down integration tests...');

    nock.cleanAll();
    nock.enableNetConnect();

    if (this.app) {
      await this.app.close().catch((error) => {
        if (
          !(error instanceof Error) ||
          !error.message.includes('Connection is closed')
        ) {
          throw error;
        }
      });
    }

    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }

    if (this.postgresContainer) {
      await this.postgresContainer.stop();
    }

    if (this.redisContainer) {
      await this.redisContainer.stop();
    }

    console.log('Integration test teardown complete');
  }

  /**
   * Clean database between tests
   */
  async cleanDatabase() {
    if (!this.dataSource) return;

    const entities = this.dataSource.entityMetadatas;
    await this.dataSource.query('SET session_replication_role = replica;');

    try {
      for (const entity of entities) {
        await this.dataSource.query(
          `TRUNCATE TABLE ${this.getTableIdentifier(entity)} CASCADE;`,
        );
      }
    } finally {
      await this.dataSource.query('SET session_replication_role = DEFAULT;');
    }
  }

  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private getTableIdentifier(entity: EntityMetadata): string {
    const tableName = this.quoteIdentifier(entity.tableName);
    return entity.schema
      ? `${this.quoteIdentifier(entity.schema)}.${tableName}`
      : tableName;
  }

  /**
   * Get application instance
   */
  getApp(): INestApplication {
    return this.app;
  }

  /**
   * Get DataSource
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Execute raw SQL query
   */
  async executeQuery(query: string, parameters?: any[]) {
    return this.dataSource.query(query, parameters);
  }
}

/**
 * Test user helper
 */
export interface TestUser {
  id: string;
  phone: string;
  accessToken: string;
  refreshToken: string;
  pinToken?: string;
  walletId?: string;
}

/**
 * Helper class for creating test users
 */
export class TestUserFactory {
  constructor(private readonly app: INestApplication) {}

  /**
   * Create a user with wallet and PIN
   */
  async createUser(phone: string): Promise<TestUser> {
    // Register
    await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' })
      .expect(201);

    // Verify OTP
    const verifyResponse = await request(this.app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp: '123456' })
      .expect(200);

    const { accessToken, refreshToken, user } = verifyResponse.body;

    return {
      id: user.id,
      phone,
      accessToken,
      refreshToken,
      walletId: user.walletId,
    };
  }

  /**
   * Create user with PIN set
   */
  async createUserWithPin(
    phone: string,
    pin: string = '6829',
  ): Promise<TestUser> {
    const user = await this.createUser(phone);

    // Set PIN
    await request(this.app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ pin, confirmPin: pin })
      .expect(200);

    // Get PIN token
    const pinResponse = await request(this.app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ pin })
      .expect(200);

    return {
      ...user,
      pinToken: pinResponse.body.pinToken,
    };
  }

  /**
   * Create multiple users
   */
  async createUsers(
    count: number,
    prefix: string = '+22507',
  ): Promise<TestUser[]> {
    const users: TestUser[] = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const phone = `${prefix}${(baseTimestamp + i).toString().slice(-8)}`;
      const user = await this.createUserWithPin(phone);
      users.push(user);
    }

    return users;
  }
}

/**
 * External API mock helper
 */
export class ExternalApiMocker {
  /**
   * Setup all external API mocks
   */
  setupAllMocks() {
    this.mockBlnkApi();
    this.mockCircleApi();
    this.mockYellowCardApi();
  }

  /**
   * Mock Blnk API
   */
  mockBlnkApi() {
    const blnkUrl = process.env.BLNK_API_URL || 'http://localhost:3999/blnk';

    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id', name: 'Test Ledger' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, {
        balance_id: 'mock-balance-id',
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

    nock(blnkUrl)
      .post('/transactions')
      .reply(201, (uri, body: any) => ({
        transaction_id: 'txn-' + Date.now(),
        amount: body.amount,
        status: 'applied',
      }))
      .persist();
  }

  /**
   * Mock Circle API
   */
  mockCircleApi() {
    const circleUrl =
      process.env.CIRCLE_API_URL || 'http://localhost:3999/circle';

    nock(circleUrl)
      .post('/v1/wallets')
      .reply(200, {
        data: { walletId: 'mock-circle-wallet-id', entityId: 'mock-entity-id' },
      })
      .persist();

    nock(circleUrl)
      .get(/\/v1\/wallets\/.*\/balance/)
      .reply(200, {
        data: { available: [{ amount: '1000.00', currency: 'USD' }] },
      })
      .persist();

    nock(circleUrl)
      .post('/v1/transfers')
      .reply(200, (uri, body: any) => ({
        data: {
          id: 'mock-transfer-id',
          status: 'complete',
          amount: body.amount,
        },
      }))
      .persist();

    nock(circleUrl)
      .post('/v1/transfers/blockchain')
      .reply(200, (uri, body: any) => ({
        data: {
          id: 'mock-blockchain-transfer-id',
          transactionHash: '0x' + 'a'.repeat(64),
          status: 'pending',
        },
      }))
      .persist();

    nock(circleUrl)
      .get(/\/v1\/transfers\/.*/)
      .reply(200, { data: { id: 'mock-transfer-id', status: 'complete' } })
      .persist();
  }

  /**
   * Mock YellowCard API
   */
  mockYellowCardApi() {
    const yellowcardUrl =
      process.env.YELLOWCARD_API_URL || 'http://localhost:3999/yellowcard';

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
        ],
      })
      .persist();

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

    nock(yellowcardUrl)
      .post('/deposits')
      .reply(201, (uri, body: any) => ({
        depositId: 'dep-' + Date.now(),
        amount: body.amount,
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

    nock(yellowcardUrl)
      .get(/\/deposits\/.*/)
      .reply(200, (uri) => ({
        depositId: uri.split('/').pop(),
        status: 'pending',
        amount: 10000,
      }))
      .persist();

    nock(yellowcardUrl)
      .post('/withdrawals')
      .reply(201, (uri, body: any) => ({
        withdrawalId: 'with-' + Date.now(),
        amount: body.amount,
        status: 'pending',
      }))
      .persist();
  }

  /**
   * Clear all mocks
   */
  clearMocks() {
    nock.cleanAll();
  }

  /**
   * Reset to default mocks
   */
  resetMocks() {
    this.clearMocks();
    this.setupAllMocks();
  }
}

/**
 * Test data fixtures
 */
export const TestFixtures = {
  phones: {
    sender: '+2250700000001',
    recipient: '+2250700000002',
    invalid: 'invalid-phone',
  },
  pins: {
    valid: '6829',
    invalid: '0000',
  },
  otps: {
    valid: '123456',
    invalid: '000000',
  },
  amounts: {
    small: 10,
    medium: 100,
    large: 1000,
    excessive: 1000000,
  },
  addresses: {
    validPolygon: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    validEthereum: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    invalid: '0xinvalid',
  },
  networks: {
    polygon: 'polygon',
    ethereum: 'ethereum',
    invalid: 'unsupported',
  },
};
