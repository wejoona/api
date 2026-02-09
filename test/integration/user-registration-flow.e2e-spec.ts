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
 * User Registration Flow Integration Tests
 *
 * Tests the complete user registration journey:
 * 1. User registration with phone number
 * 2. OTP verification
 * 3. Profile completion
 * 4. Wallet creation
 * 5. PIN setup
 *
 * Uses testcontainers for PostgreSQL and Redis isolation.
 */
describe('User Registration Flow (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let dataSource: DataSource;

  // Increase timeout for container startup
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

    // Disable external notifications
    process.env.NOTIFICATION_ENABLED = 'false';

    // Setup nock for external API mocking
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    nock.enableNetConnect('localhost');

    // Mock external APIs
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

  beforeEach(async () => {
    // Clean database between tests
    await cleanDatabase();
  });

  async function cleanDatabase() {
    if (!dataSource) return;

    const entities = dataSource.entityMetadatas;
    await dataSource.query('SET session_replication_role = replica;');

    for (const entity of entities) {
      await dataSource.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }

    await dataSource.query('SET session_replication_role = DEFAULT;');
  }

  function setupExternalApiMocks() {
    // Mock Blnk API
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
        balance: 0,
        currency: 'USD',
      })
      .persist();

    // Mock Circle API
    const circleUrl =
      process.env.CIRCLE_API_URL || 'http://localhost:3999/circle';
    nock(circleUrl)
      .post('/v1/wallets')
      .reply(200, {
        data: {
          walletId: 'mock-circle-wallet-id',
          entityId: 'mock-entity-id',
        },
      })
      .persist();
  }

  describe('Complete Registration Flow', () => {
    const testPhone = '+2250700000001';
    const testCountryCode = 'CI';

    it('should complete full user registration journey', async () => {
      // Step 1: Initiate registration
      console.log('Step 1: Initiating registration...');
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: testCountryCode,
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('message');
      expect(registerResponse.body.message).toContain('OTP');

      // Step 2: Verify OTP
      console.log('Step 2: Verifying OTP...');
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '123456', // Test OTP
        })
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('accessToken');
      expect(verifyResponse.body).toHaveProperty('refreshToken');
      expect(verifyResponse.body).toHaveProperty('user');
      expect(verifyResponse.body.user).toHaveProperty('id');
      expect(verifyResponse.body.user.phone).toBe(testPhone);

      const { accessToken, user } = verifyResponse.body;

      // Step 3: Complete profile
      console.log('Step 3: Completing profile...');
      const profileResponse = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Jean',
          lastName: 'Kouassi',
          email: 'jean.kouassi@example.com',
          username: 'jeankouassi',
        })
        .expect(200);

      expect(profileResponse.body).toHaveProperty('firstName', 'Jean');
      expect(profileResponse.body).toHaveProperty('lastName', 'Kouassi');
      expect(profileResponse.body).toHaveProperty(
        'email',
        'jean.kouassi@example.com',
      );

      // Step 4: Verify wallet was created
      console.log('Step 4: Verifying wallet...');
      const walletResponse = await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(walletResponse.body).toHaveProperty('id');
      expect(walletResponse.body).toHaveProperty('userId', user.id);

      // Step 5: Set transaction PIN
      console.log('Step 5: Setting PIN...');
      const pinResponse = await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '1234',
        })
        .expect(200);

      expect(pinResponse.body).toHaveProperty('success', true);

      // Step 6: Verify PIN works
      console.log('Step 6: Verifying PIN...');
      const verifyPinResponse = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
        })
        .expect(200);

      expect(verifyPinResponse.body).toHaveProperty('pinToken');

      console.log('Registration flow completed successfully');
    });

    it('should reject duplicate phone registration', async () => {
      // Register first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: testCountryCode,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '123456',
        })
        .expect(200);

      // Attempt duplicate registration
      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: testCountryCode,
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body).toHaveProperty('message');
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '12345',
        'invalid',
        '+1',
        '',
        '00000000000000000000',
      ];

      for (const invalidPhone of invalidPhones) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            phone: invalidPhone,
            countryCode: testCountryCode,
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject invalid OTP', async () => {
      // Register
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: testCountryCode,
        })
        .expect(201);

      // Verify with wrong OTP
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '000000',
        });

      expect(response.status).toBe(401);
    });

    it('should lock account after multiple failed OTP attempts', async () => {
      // Register
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: testCountryCode,
        })
        .expect(201);

      // Attempt multiple wrong OTPs
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/auth/verify-otp').send({
          phone: testPhone,
          otp: '000000',
        });
      }

      // Next attempt should be locked
      const lockedResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '123456', // Even correct OTP
        });

      expect(lockedResponse.status).toBe(423); // Locked
    });
  });

  describe('Profile Completion', () => {
    let accessToken: string;

    beforeEach(async () => {
      const phone = `+22507${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, countryCode: 'CI' })
        .expect(201);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      accessToken = verifyResponse.body.accessToken;
    });

    it('should update user profile with valid data', async () => {
      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Aminata',
          lastName: 'Diallo',
          email: 'aminata@example.com',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Aminata');
      expect(response.body.lastName).toBe('Diallo');
      expect(response.body.email).toBe('aminata@example.com');
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });

    it('should validate username format', async () => {
      // Too short
      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'ab' })
        .expect(400);

      // Too long
      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'a'.repeat(31) })
        .expect(400);

      // Invalid characters
      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'user@name' })
        .expect(400);
    });

    it('should reject duplicate username', async () => {
      // Create first user with username
      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'uniqueuser' })
        .expect(200);

      // Create second user
      const phone2 = `+22507${(Date.now() + 1).toString().slice(-8)}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: phone2, countryCode: 'CI' })
        .expect(201);

      const verify2 = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: phone2, otp: '123456' })
        .expect(200);

      // Attempt duplicate username
      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${verify2.body.accessToken}`)
        .send({ username: 'uniqueuser' });

      expect(response.status).toBe(409);
    });
  });

  describe('PIN Management', () => {
    let accessToken: string;

    beforeEach(async () => {
      const phone = `+22507${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, countryCode: 'CI' })
        .expect(201);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      accessToken = verifyResponse.body.accessToken;
    });

    it('should set PIN with matching confirmation', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '1234',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject PIN with mismatched confirmation', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '5678',
        });

      expect(response.status).toBe(400);
    });

    it('should reject PIN with invalid format', async () => {
      const invalidPins = ['123', '12345', 'abcd', '1a2b', ''];

      for (const pin of invalidPins) {
        const response = await request(app.getHttpServer())
          .post('/wallet/pin/set')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            pin,
            confirmPin: pin,
          });

        expect(response.status).toBe(400);
      }
    });

    it('should change PIN with old PIN verification', async () => {
      // Set initial PIN
      await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '1234',
        })
        .expect(200);

      // Change PIN
      const response = await request(app.getHttpServer())
        .post('/wallet/pin/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPin: '1234',
          newPin: '5678',
          confirmNewPin: '5678',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new PIN works
      await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '5678' })
        .expect(200);
    });

    it('should lock PIN after multiple failed attempts', async () => {
      // Set PIN
      await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '1234',
        })
        .expect(200);

      // Multiple wrong PIN attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/wallet/pin/verify')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ pin: '0000' });
      }

      // Should be locked
      const lockedResponse = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '1234' }); // Even correct PIN

      expect(lockedResponse.status).toBe(423);
    });
  });

  describe('Token Management', () => {
    let accessToken: string;
    let refreshToken: string;
    const testPhone = '+2250700000099';

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: testPhone, countryCode: 'CI' })
        .expect(201);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: '123456' })
        .expect(200);

      accessToken = verifyResponse.body.accessToken;
      refreshToken = verifyResponse.body.refreshToken;
    });

    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should invalidate tokens on logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Token should be invalid
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
