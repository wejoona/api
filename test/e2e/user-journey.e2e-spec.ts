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

describe('User Journey E2E Tests', () => {
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
  }, 120000); // 2 minutes timeout for container startup

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
    mockProviders.resetMocks();
  });

  describe('Complete User Onboarding Journey', () => {
    let authToken: string;
    let userId: string;
    let refreshToken: string;

    it('should register a new user with phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+2250700000001',
          countryCode: 'CI',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
      expect(response.body.expiresIn).toBeDefined();
    });

    it('should verify OTP and create user account', async () => {
      // Request OTP
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+2250700000001',
          countryCode: 'CI',
        })
        .expect(201);

      // Verify OTP
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: '+2250700000001',
          otp: '123456',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.phone).toBe('+2250700000001');
      expect(response.body.walletCreated).toBe(true);

      // Save for next tests
      authToken = response.body.accessToken;
      userId = response.body.user.id;
      refreshToken = response.body.refreshToken;
    });

    it('should get user profile', async () => {
      const user = await userHelper.createUser('+2250700000002');

      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
      expect(response.body.phone).toBe('+2250700000002');
    });

    it('should update user profile', async () => {
      const user = await userHelper.createUser('+2250700000003');

      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          username: 'johndoe',
        })
        .expect(200);

      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.email).toBe('john.doe@example.com');
      expect(response.body.username).toBe('johndoe');
    });

    it('should set transaction PIN', async () => {
      const user = await userHelper.createUser('+2250700000004');

      const response = await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          pin: '1234',
          confirmPin: '1234',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('PIN set successfully');
    });

    it('should refresh access token', async () => {
      const user = await userHelper.createUser('+2250700000005');

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: user.refreshToken,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(user.accessToken);
    });
  });

  describe('Wallet Operations Journey', () => {
    it('should get wallet balance', async () => {
      const user = await userHelper.createUser('+2250700000010');

      const response = await request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.walletId).toBeDefined();
      expect(response.body.currency).toBeDefined();
      expect(response.body.balances).toBeDefined();
      expect(Array.isArray(response.body.balances)).toBe(true);
    });

    it('should get available deposit channels', async () => {
      const user = await userHelper.createUser('+2250700000011');

      const response = await request(app.getHttpServer())
        .get('/wallet/deposit/channels?currency=XOF')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.channels).toBeDefined();
      expect(Array.isArray(response.body.channels)).toBe(true);
      expect(response.body.channels.length).toBeGreaterThan(0);
      expect(response.body.channels[0]).toHaveProperty('id');
      expect(response.body.channels[0]).toHaveProperty('name');
      expect(response.body.channels[0]).toHaveProperty('type');
    });

    it('should get exchange rate quote', async () => {
      const user = await userHelper.createUser('+2250700000012');

      const response = await request(app.getHttpServer())
        .get('/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.sourceCurrency).toBe('XOF');
      expect(response.body.targetCurrency).toBe('USD');
      expect(response.body.rate).toBeDefined();
      expect(response.body.sourceAmount).toBe(10000);
      expect(response.body.targetAmount).toBeDefined();
      expect(response.body.fee).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });
  });

  describe('Transfer Journey', () => {
    it('should complete internal P2P transfer', async () => {
      // Create sender and recipient
      const sender = await userHelper.createUser('+2250700000020');
      const recipient = await userHelper.createUser('+2250700000021');

      // Set PIN for sender
      await userHelper.setPin(sender.accessToken, '1234');

      // Get PIN token
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // Create transfer
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

      expect(response.body.status).toBe('completed');
      expect(response.body.amount).toBe(10);
      expect(response.body.toPhone).toBe(recipient.phone);
      expect(response.body.transactionId).toBeDefined();
    });

    it('should fail transfer without PIN verification', async () => {
      const sender = await userHelper.createUser('+2250700000022');
      const recipient = await userHelper.createUser('+2250700000023');

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

    it('should get transfer history', async () => {
      const user = await userHelper.createUser('+2250700000024');

      const response = await request(app.getHttpServer())
        .get('/transfers?limit=20&offset=0')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.transfers).toBeDefined();
      expect(Array.isArray(response.body.transfers)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.limit).toBe(20);
      expect(response.body.offset).toBe(0);
    });
  });

  describe('Username System Journey', () => {
    it('should check username availability', async () => {
      const user = await userHelper.createUser('+2250700000030');

      const response = await request(app.getHttpServer())
        .get('/user/username/check/johndoe')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.available).toBeDefined();
      expect(typeof response.body.available).toBe('boolean');
    });

    it('should search for users by username', async () => {
      // Create user with username
      const user = await userHelper.createUser('+2250700000031');
      await userHelper.updateProfile(user.accessToken, {
        username: 'searchme',
      });

      // Search from another user
      const searcher = await userHelper.createUser('+2250700000032');

      const response = await request(app.getHttpServer())
        .get('/user/username/search?query=search&limit=10')
        .set('Authorization', `Bearer ${searcher.accessToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should find user by username', async () => {
      // Create user with username
      const user = await userHelper.createUser('+2250700000033');
      await userHelper.updateProfile(user.accessToken, { username: 'findme' });

      // Find from another user
      const finder = await userHelper.createUser('+2250700000034');

      const response = await request(app.getHttpServer())
        .get('/user/by-username/findme')
        .set('Authorization', `Bearer ${finder.accessToken}`)
        .expect(200);

      expect(response.body.username).toBe('findme');
      expect(response.body.id).toBe(user.id);
    });
  });

  describe('Security Journey', () => {
    it('should logout successfully', async () => {
      const user = await userHelper.createUser('+2250700000040');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          refreshToken: user.refreshToken,
        })
        .expect(200);

      // Try to use the access token after logout (should still work for now, as we use stateless JWT)
      // In production with token blacklisting, this would fail
    });

    it('should reject invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+2250700000041',
          countryCode: 'CI',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: '+2250700000041',
          otp: '000000', // Invalid OTP
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/user/profile').expect(401);
    });

    it('should reject invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should lock PIN after too many failed attempts', async () => {
      const user = await userHelper.createUser('+2250700000042');
      await userHelper.setPin(user.accessToken, '1234');

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/wallet/pin/verify')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ pin: '0000' })
          .expect(i < 4 ? 400 : 403); // Last attempt should be 403 (locked)
      }

      // Next attempt should indicate locked status
      const response = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ pin: '1234' })
        .expect(403);

      expect(response.body.message).toContain('locked');
    });
  });

  describe('Error Handling Journey', () => {
    it('should validate phone number format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: 'invalid-phone',
          countryCode: 'CI',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate transfer amount', async () => {
      const sender = await userHelper.createUser('+2250700000050');
      const recipient = await userHelper.createUser('+2250700000051');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: recipient.phone,
          amount: -10, // Invalid negative amount
          currency: 'USDC',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should handle non-existent recipient', async () => {
      const sender = await userHelper.createUser('+2250700000052');

      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Pin-Token', pinToken)
        .send({
          toPhone: '+2250799999999', // Non-existent user
          amount: 10,
          currency: 'USDC',
        })
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });
});
