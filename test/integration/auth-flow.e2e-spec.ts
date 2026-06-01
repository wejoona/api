import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestSetup } from '../e2e/setup';
import {
  TestDataHelper,
  TestUserHelper,
  setupNock,
  teardownNock,
} from '../e2e/helpers';

describe('Auth Flow (e2e)', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let dataHelper: TestDataHelper;
  let userHelper: TestUserHelper;

  const otp = '123456';

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    dataHelper = new TestDataHelper(app);
    userHelper = new TestUserHelper(app);
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
  });

  const uniquePhone = () => `+22507${Date.now().toString().slice(-8)}`;

  const register = (phone: string) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' });

  describe('User Registration', () => {
    it('should register a new phone-first user', async () => {
      const response = await register(uniquePhone()).expect(201);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('OTP sent'),
        expiresIn: expect.any(Number),
      });
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(60);
    });

    it('should reject registration fields outside the current contract', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: uniquePhone(),
          countryCode: 'CI',
          email: 'newuser@example.com',
          name: 'New User',
        })
        .expect(400);
    });

    it('should validate phone number format', async () => {
      await register('123').expect(400);
    });

    it('should return an enumeration-safe response for duplicate phone numbers', async () => {
      const phone = uniquePhone();

      await register(phone).expect(201);
      const duplicateResponse = await register(phone).expect(201);

      expect(duplicateResponse.body.success).toBe(true);
      expect(duplicateResponse.body.expiresIn).toBeDefined();
    });
  });

  describe('Login Flow', () => {
    it('should send OTP for an existing user', async () => {
      const user = await userHelper.createUser(uniquePhone());

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: user.phone })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiresIn).toBeDefined();
    });

    it('should reject login for a non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '+2250700000999' })
        .expect(404);
    });

    it('should verify OTP and return tokens', async () => {
      const phone = uniquePhone();
      await register(phone).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(300);
      expect(response.body.user).toMatchObject({ phone });
    });

    it('should reject invalid OTP', async () => {
      const phone = uniquePhone();
      await register(phone).expect(201);

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp: '000000' })
        .expect(401);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with a valid refresh token', async () => {
      const user = await userHelper.createUser(uniquePhone());

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(300);
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('Logout', () => {
    it('should logout and invalidate the refresh token', async () => {
      const user = await userHelper.createUser(uniquePhone());

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });

    it('should logout from all devices', async () => {
      const user = await userHelper.createUser(uniquePhone());

      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ currentRefreshToken: user.refreshToken })
        .expect(200);
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer()).get('/user/profile').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with a valid token', async () => {
      const user = await userHelper.createUser(uniquePhone());

      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
      expect(response.body.phone).toBe(user.phone);
    });
  });
});
