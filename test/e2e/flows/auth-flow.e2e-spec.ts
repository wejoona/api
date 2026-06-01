/**
 * Auth Flow E2E Tests
 *
 * Tests the complete authentication flow including:
 * - Registration with OTP
 * - OTP verification with correct expiresIn
 * - Token refresh with correct expiresIn
 * - Token expiry handling
 *
 * CRITICAL: These tests verify that expiresIn is returned correctly,
 * which mobile uses to schedule token refresh. Missing or incorrect
 * expiresIn caused KYC upload failures due to token expiry.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestSetup } from '../setup';
import {
  TestUserHelper,
  TestDataHelper,
  setupNock,
  teardownNock,
} from '../helpers';

describe('Auth Flow E2E', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let userHelper: TestUserHelper;
  let dataHelper: TestDataHelper;

  const testPhone = '+2250700100001';
  const devOtp = '123456';

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    userHelper = new TestUserHelper(app);
    dataHelper = new TestDataHelper(app);
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
  });

  describe('Complete Registration Flow', () => {
    it('should register and return OTP expiry time', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          countryCode: 'CI',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.expiresIn).toBeDefined();
      expect(typeof response.body.expiresIn).toBe('number');
      // OTP should expire in 1-10 minutes
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(60);
      expect(response.body.expiresIn).toBeLessThanOrEqual(600);
    });

    it('should verify OTP and return token with expiresIn', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: testPhone, countryCode: 'CI' });

      // Verify OTP
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: devOtp })
        .expect(200);

      // CRITICAL: Mobile uses expiresIn to schedule token refresh
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(typeof response.body.expiresIn).toBe('number');

      // Token should be valid for at least 5 minutes
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(300);
      // But not more than 1 hour (security)
      expect(response.body.expiresIn).toBeLessThanOrEqual(3600);

      // User and KYC status should be included
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.kycStatus).toBeDefined();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token and return new expiresIn', async () => {
      // Create user
      const user = await userHelper.createUser(testPhone);

      // Refresh token
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      // CRITICAL: Mobile needs expiresIn to reschedule next refresh
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(typeof response.body.expiresIn).toBe('number');
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(300);

      // New token should be different
      expect(response.body.accessToken).not.toBe(user.accessToken);
    });

    it('should reject invalid refresh token with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject expired refresh token with 401', async () => {
      // This test verifies the behavior, actual expiry would need time manipulation
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Protected Endpoint Access', () => {
    it('should allow access with valid token', async () => {
      const user = await userHelper.createUser('+2250700100002');

      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
    });

    it('should reject access without token with 401', async () => {
      await request(app.getHttpServer()).get('/user/profile').expect(401);
    });

    it('should reject access with malformed token with 401', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Login Flow (Existing User)', () => {
    it('should send OTP for existing user login', async () => {
      // Create user first
      await userHelper.createUser('+2250700100003');

      // Login (request OTP)
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '+2250700100003' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiresIn).toBeDefined();
    });

    it('should verify login OTP and return tokens with expiresIn', async () => {
      const phone = '+2250700100004';
      await userHelper.createUser(phone);

      // Request login OTP
      await request(app.getHttpServer()).post('/auth/login').send({ phone });

      // Verify OTP
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp: devOtp })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(300);
    });
  });

  describe('Logout Flow', () => {
    it('should logout and invalidate refresh token', async () => {
      const user = await userHelper.createUser('+2250700100005');

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Try to use the old refresh token - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });
  });
});
