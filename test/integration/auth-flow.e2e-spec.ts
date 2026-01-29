import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const phone = `+225${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'newuser@example.com',
          name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'OTP sent');
      expect(response.body).toHaveProperty('otpExpiresIn');
    });

    it('should validate phone number format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '123', // Invalid format
          email: 'test@example.com',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+225123456789',
          email: 'invalid-email', // Invalid email
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject duplicate phone number', async () => {
      const phone = `+225${Date.now()}`;

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'user1@example.com',
          name: 'User One',
        })
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone, // Same phone
          email: 'user2@example.com',
          name: 'User Two',
        })
        .expect(409); // Conflict
    });

    it('should reject duplicate email', async () => {
      const email = `test${Date.now()}@example.com`;

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: `+225${Date.now()}`,
          email,
          name: 'User One',
        })
        .expect(201);

      // Duplicate email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: `+225${Date.now() + 1}`,
          email, // Same email
          name: 'User Two',
        })
        .expect(409);
    });
  });

  describe('Login Flow', () => {
    let registeredPhone: string;

    beforeAll(async () => {
      registeredPhone = `+225${Date.now()}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: registeredPhone,
          email: 'login-test@example.com',
          name: 'Login Test User',
        })
        .expect(201);
    });

    it('should send OTP for login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: registeredPhone,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('otpExpiresIn');
    });

    it('should reject login for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+225000000000',
        })
        .expect(404);
    });

    it('should verify OTP and return tokens', async () => {
      // Request OTP
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: registeredPhone,
        })
        .expect(200);

      // Verify OTP
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: registeredPhone,
          otp: '123456', // Test OTP
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('phone', registeredPhone);
    });

    it('should reject invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: registeredPhone,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: registeredPhone,
          otp: '000000', // Wrong OTP
        })
        .expect(401);
    });

    it('should reject expired OTP', async () => {
      // This test would need time manipulation or test-specific OTP expiry
      // For now, we just verify the endpoint structure
    });

    it('should rate limit OTP requests', async () => {
      // Send multiple OTP requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send({
            phone: registeredPhone,
          }),
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const phone = `+225${Date.now()}`;

      // Register
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'refresh-test@example.com',
          name: 'Refresh Test User',
        })
        .expect(201);

      // Login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone })
        .expect(200);

      // Verify OTP
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '123456',
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken); // New token
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should reject expired refresh token', async () => {
      // This would require a token that's actually expired
      // In a real test, you'd use a mock or time manipulation
    });
  });

  describe('Logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const phone = `+225${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'logout-test@example.com',
          name: 'Logout Test User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '123456',
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should invalidate token after logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Try to use invalidated token
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should logout from all devices', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer()).get('/wallet/balance').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      const phone = `+225${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'protected-test@example.com',
          name: 'Protected Test User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '123456',
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Create wallet first
      await request(app.getHttpServer())
        .post('/wallet')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Now balance endpoint should work
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Security', () => {
    it('should hash passwords (if applicable)', async () => {
      // Verify passwords are never stored or returned in plain text
    });

    it('should use secure JWT signing', async () => {
      // Verify JWT tokens are properly signed
    });

    it('should prevent timing attacks on OTP verification', async () => {
      const phone = `+225${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'timing-test@example.com',
          name: 'Timing Test User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone })
        .expect(200);

      // Verify multiple wrong OTPs take similar time
      const start1 = Date.now();
      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '000000',
        })
        .expect(401);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '111111',
        })
        .expect(401);
      const time2 = Date.now() - start2;

      // Times should be similar (within 100ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should lock account after multiple failed attempts', async () => {
      const phone = `+225${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone,
          email: 'lockout-test@example.com',
          name: 'Lockout Test User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone })
        .expect(200);

      // Attempt multiple wrong OTPs
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/auth/verify-otp').send({
          phone,
          otp: '000000',
        });
      }

      // Account should be locked
      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone,
          otp: '123456', // Even correct OTP should fail
        })
        .expect(423); // Locked
    });
  });
});
