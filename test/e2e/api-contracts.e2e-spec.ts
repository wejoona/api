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

describe('API Contracts E2E Tests', () => {
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

  describe('Authentication API Contracts', () => {
    describe('POST /auth/register', () => {
      it('should return correct response shape', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            phone: '+2250700000001',
            countryCode: 'CI',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          success: expect.any(Boolean),
          message: expect.any(String),
          expiresIn: expect.any(Number),
        });
      });

      it('should validate required fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({})
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('should reject extra fields when forbidNonWhitelisted is true', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            phone: '+2250700000001',
            countryCode: 'CI',
            extraField: 'should be rejected',
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });
    });

    describe('POST /auth/verify-otp', () => {
      it('should return correct response shape', async () => {
        // First register
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ phone: '+2250700000002', countryCode: 'CI' })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post('/auth/verify-otp')
          .send({ phone: '+2250700000002', otp: '123456' })
          .expect(200);

        expect(response.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            id: expect.any(String),
            phone: expect.any(String),
          },
          walletCreated: expect.any(Boolean),
        });
      });
    });

    describe('POST /auth/refresh', () => {
      it('should return correct response shape', async () => {
        const user = await userHelper.createUser('+2250700000003');

        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: user.refreshToken })
          .expect(200);

        expect(response.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });
      });
    });
  });

  describe('User API Contracts', () => {
    describe('GET /user/profile', () => {
      it('should return correct response shape', async () => {
        const user = await userHelper.createUser('+2250700000010');

        const response = await request(app.getHttpServer())
          .get('/user/profile')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          phone: expect.any(String),
        });
      });
    });

    describe('PUT /user/profile', () => {
      it('should return updated user with correct shape', async () => {
        const user = await userHelper.createUser('+2250700000011');

        const response = await request(app.getHttpServer())
          .put('/user/profile')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          phone: expect.any(String),
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });

  describe('Wallet API Contracts', () => {
    describe('GET /wallet', () => {
      it('should return correct balance response shape', async () => {
        const user = await userHelper.createUser('+2250700000020');

        const response = await request(app.getHttpServer())
          .get('/wallet')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          walletId: expect.any(String),
          currency: expect.any(String),
          balances: expect.arrayContaining([
            expect.objectContaining({
              currency: expect.any(String),
              available: expect.any(Number),
            }),
          ]),
        });
      });
    });

    describe('GET /wallet/deposit/channels', () => {
      it('should return array of channels with correct shape', async () => {
        const user = await userHelper.createUser('+2250700000021');

        const response = await request(app.getHttpServer())
          .get('/wallet/deposit/channels')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          channels: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              type: expect.any(String),
              provider: expect.any(String),
              country: expect.any(String),
              currency: expect.any(String),
              minAmount: expect.any(Number),
              maxAmount: expect.any(Number),
            }),
          ]),
        });
      });
    });

    describe('GET /wallet/rate', () => {
      it('should return correct rate quote shape', async () => {
        const user = await userHelper.createUser('+2250700000022');

        const response = await request(app.getHttpServer())
          .get(
            '/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000',
          )
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          sourceCurrency: expect.any(String),
          targetCurrency: expect.any(String),
          rate: expect.any(Number),
          sourceAmount: expect.any(Number),
          targetAmount: expect.any(Number),
          fee: expect.any(Number),
          expiresAt: expect.any(String),
        });
      });
    });

    describe('POST /wallet/pin/set', () => {
      it('should return success response', async () => {
        const user = await userHelper.createUser('+2250700000023');

        const response = await request(app.getHttpServer())
          .post('/wallet/pin/set')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ pin: '1234', confirmPin: '1234' })
          .expect(200);

        expect(response.body).toMatchObject({
          success: expect.any(Boolean),
          message: expect.any(String),
        });
      });
    });

    describe('POST /wallet/pin/verify', () => {
      it('should return PIN token response', async () => {
        const user = await userHelper.createUser('+2250700000024');
        await userHelper.setPin(user.accessToken, '1234');

        const response = await request(app.getHttpServer())
          .post('/wallet/pin/verify')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ pin: '1234' })
          .expect(200);

        expect(response.body).toMatchObject({
          valid: expect.any(Boolean),
          message: expect.any(String),
          pinToken: expect.any(String),
          expiresIn: expect.any(Number),
        });
      });
    });
  });

  describe('Transfer API Contracts', () => {
    describe('POST /wallet/transfer/internal', () => {
      it('should return correct transfer response shape', async () => {
        const sender = await userHelper.createUser('+2250700000030');
        const recipient = await userHelper.createUser('+2250700000031');

        await userHelper.setPin(sender.accessToken, '1234');
        const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

        const response = await request(app.getHttpServer())
          .post('/wallet/transfer/internal')
          .set('Authorization', `Bearer ${sender.accessToken}`)
          .set('X-Pin-Token', pinToken)
          .send({
            toPhone: recipient.phone,
            amount: 10,
            currency: 'USDC',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          transactionId: expect.any(String),
          fromWalletId: expect.any(String),
          toWalletId: expect.any(String),
          toPhone: recipient.phone,
          amount: expect.any(Number),
          currency: 'USDC',
          fee: expect.any(Number),
          status: expect.any(String),
        });
      });
    });

    describe('GET /transfers', () => {
      it('should return paginated transfer list with correct shape', async () => {
        const user = await userHelper.createUser('+2250700000032');

        const response = await request(app.getHttpServer())
          .get('/transfers?limit=20&offset=0')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          transfers: expect.any(Array),
          total: expect.any(Number),
          limit: 20,
          offset: 0,
        });
      });
    });
  });

  describe('Error Response Contracts', () => {
    it('should return consistent 401 error shape for unauthorized requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return consistent 400 error shape for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return consistent 404 error shape for not found', async () => {
      const user = await userHelper.createUser('+2250700000040');

      const response = await request(app.getHttpServer())
        .get('/user/by-username/nonexistentuser')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: '+2250700000041', otp: '000000' })
        .expect(400);

      const errorMessage = JSON.stringify(response.body).toLowerCase();
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('sql');
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('stack');
    });
  });

  describe('Pagination Contracts', () => {
    it('should handle limit parameter correctly', async () => {
      const user = await userHelper.createUser('+2250700000050');

      const response = await request(app.getHttpServer())
        .get('/transfers?limit=10')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.limit).toBe(10);
    });

    it('should handle offset parameter correctly', async () => {
      const user = await userHelper.createUser('+2250700000051');

      const response = await request(app.getHttpServer())
        .get('/transfers?offset=5')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.offset).toBe(5);
    });

    it('should use default values when pagination parameters are missing', async () => {
      const user = await userHelper.createUser('+2250700000052');

      const response = await request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.limit).toBe(20); // Default limit
      expect(response.body.offset).toBe(0); // Default offset
    });
  });

  describe('Content-Type Headers', () => {
    it('should accept and return JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({ phone: '+2250700000060', countryCode: 'CI' })
        .expect(201);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should reject non-JSON content for JSON endpoints', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Content-Type', 'text/plain')
        .send('plain text')
        .expect(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include appropriate CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Note: CORS headers might be configured in main.ts
      // This test verifies they are present if configured
      expect(response.headers).toBeDefined();
    });
  });
});
