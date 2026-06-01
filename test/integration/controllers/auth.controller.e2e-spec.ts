/**
 * Auth Controller Integration Tests
 *
 * Tests: POST /auth/register, /auth/verify-otp, /auth/login, /auth/refresh, /auth/logout, /auth/logout-all
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createUnauthTestApp,
  TEST_USER,
} from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

// Mock use cases
const mockRegisterUser = { execute: jest.fn() };
const mockVerifyOtp = { execute: jest.fn() };
const mockLoginUser = { execute: jest.fn() };
const mockRefreshToken = { execute: jest.fn() };
const mockLogout = { execute: jest.fn() };
const mockLogoutAll = { execute: jest.fn() };

// Import after defining mocks
import { AuthController } from '@modules/user/application/controllers/user.controller';
import {
  RegisterUserUsecase,
  VerifyOtpUsecase,
  LoginUserUsecase,
  RefreshTokenUsecase,
  LogoutUsecase,
  LogoutAllUsecase,
} from '@modules/user/application/domain/usecases';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUserUsecase, useValue: mockRegisterUser },
        { provide: VerifyOtpUsecase, useValue: mockVerifyOtp },
        { provide: LoginUserUsecase, useValue: mockLoginUser },
        { provide: RefreshTokenUsecase, useValue: mockRefreshToken },
        { provide: LogoutUsecase, useValue: mockLogout },
        { provide: LogoutAllUsecase, useValue: mockLogoutAll },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // POST /auth/register
  // ==========================================
  describe('POST /api/v1/auth/register', () => {
    it('should register successfully (201)', async () => {
      mockRegisterUser.execute.mockResolvedValue({ otpExpiresIn: 300 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+2250701234567', countryCode: 'CI' })
        .expect(201);

      expect(res.body).toEqual({
        success: true,
        message: expect.stringContaining('OTP sent'),
        expiresIn: 300,
      });
      expect(mockRegisterUser.execute).toHaveBeenCalledWith({
        phone: '+2250701234567',
        countryCode: 'CI',
      });
    });

    it('should return 400 for missing phone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ countryCode: 'CI' })
        .expect(400);
    });

    it('should register with default country when countryCode is missing (201)', async () => {
      mockRegisterUser.execute.mockResolvedValue({ otpExpiresIn: 300 });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+2250701234567' })
        .expect(201);
    });

    it('should return 400 for empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
    });
  });

  // ==========================================
  // POST /auth/verify-otp
  // ==========================================
  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP successfully (200)', async () => {
      const authResponse = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        user: TestData.user(),
      };
      mockVerifyOtp.execute.mockResolvedValue(authResponse);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+2250701234567', otp: '123456' })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(mockVerifyOtp.execute).toHaveBeenCalled();
    });

    it('should return 400 for missing otp', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+2250701234567' })
        .expect(400);
    });

    it('should return 400 for missing phone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ otp: '123456' })
        .expect(400);
    });
  });

  // ==========================================
  // POST /auth/login
  // ==========================================
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully (200)', async () => {
      mockLoginUser.execute.mockResolvedValue({ otpExpiresIn: 300 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: '+2250701234567' })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(mockLoginUser.execute).toHaveBeenCalled();
    });

    it('should return 400 for missing phone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ==========================================
  // POST /auth/refresh
  // ==========================================
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully (200)', async () => {
      mockRefreshToken.execute.mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 900,
        user: TestData.user(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'mock.refresh.token' })
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should return 400 for missing refreshToken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ==========================================
  // POST /auth/logout
  // ==========================================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully (200)', async () => {
      mockLogout.execute.mockResolvedValue({ success: true });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer mock.token')
        .send({ refreshToken: 'mock.refresh.token' })
        .expect(200);
    });
  });

  // ==========================================
  // POST /auth/logout-all
  // ==========================================
  describe('POST /api/v1/auth/logout-all', () => {
    it('should logout all sessions (200)', async () => {
      mockLogoutAll.execute.mockResolvedValue({ success: true, count: 3 });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', 'Bearer mock.token')
        .send({})
        .expect(200);
    });
  });
});
