/**
 * User Profile Controller Integration Tests
 *
 * Tests: GET/PUT /user/profile, POST/DELETE /user/avatar, PUT /user/locale,
 *        POST /user/deactivate, GET /user/data-export, GET /user/search
 */

import { INestApplication, forwardRef } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockGetProfile = { execute: jest.fn() };
const mockUpdateProfile = { execute: jest.fn() };
const mockUsernameUsecase = {
  checkAvailability: jest.fn(),
  search: jest.fn(),
  findByUsername: jest.fn(),
};
const mockGetUserLimits = { execute: jest.fn() };
const mockSetPin = { execute: jest.fn() };
const mockChangePin = { execute: jest.fn() };
const mockVerifyPin = { execute: jest.fn() };
const mockResetPin = { execute: jest.fn() };
const mockUploadService = {
  uploadAvatar: jest.fn(),
  uploadDocument: jest.fn(),
  getFileBuffer: jest.fn(),
  deleteDocument: jest.fn(),
};
const mockUserRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};

import { UserController } from '@modules/user/application/controllers/user.controller';
import {
  GetProfileUsecase,
  UpdateProfileUsecase,
  UsernameUsecase,
  GetUserLimitsUseCase,
  SetPinUsecase,
  ChangePinUsecase,
  VerifyPinUsecase,
  ResetPinUsecase,
} from '@modules/user/application/domain/usecases';
import { UploadService } from '@modules/upload/application/services/upload.service';
import { UserRepository } from '@modules/user/infrastructure/repositories';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [UserController],
      providers: [
        { provide: GetProfileUsecase, useValue: mockGetProfile },
        { provide: UpdateProfileUsecase, useValue: mockUpdateProfile },
        { provide: UsernameUsecase, useValue: mockUsernameUsecase },
        { provide: GetUserLimitsUseCase, useValue: mockGetUserLimits },
        { provide: SetPinUsecase, useValue: mockSetPin },
        { provide: ChangePinUsecase, useValue: mockChangePin },
        { provide: VerifyPinUsecase, useValue: mockVerifyPin },
        { provide: ResetPinUsecase, useValue: mockResetPin },
        { provide: UploadService, useValue: mockUploadService },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ==========================================
  // GET /user/profile
  // ==========================================
  describe('GET /api/v1/user/profile', () => {
    it('should return user profile (200)', async () => {
      const user = TestData.user({
        firstName: 'Awa',
        lastName: 'Kone',
        avatarUrl: '/user/avatar/550e8400-e29b-41d4-a716-446655440000',
        avatarThumb: 'data:image/jpeg;base64,abc123',
        preferredLocale: 'fr',
        countryCode: 'CI',
        kycStatus: 'approved',
        hasPin: true,
      });
      mockGetProfile.execute.mockResolvedValue({
        user,
        kycRejectionReason: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer mock.token')
        .expect(200);

      expect(mockGetProfile.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
      });
      expect(res.body).toMatchObject({
        id: user.id,
        phone: user.phone,
        firstName: 'Awa',
        lastName: 'Kone',
        avatarUrl: '/user/avatar/550e8400-e29b-41d4-a716-446655440000',
        avatarThumb: 'data:image/jpeg;base64,abc123',
        preferredLocale: 'fr',
        countryCode: 'CI',
        kycStatus: 'approved',
        kycRejectionReason: null,
        canTransact: true,
        canWithdraw: true,
        hasPin: true,
      });
    });

    it('should return mobile-safe dependency failure metadata (503)', async () => {
      mockGetProfile.execute.mockRejectedValue(
        new Error('profile database unavailable'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer mock.token')
        .expect(503)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            success: false,
            error: {
              code: 'PROFILE_DEPENDENCY_UNAVAILABLE',
              dependency: 'user_profile_store',
              retryable: true,
              supportReviewRequired: false,
            },
            meta: {
              path: '/api/v1/user/profile',
              method: 'GET',
            },
          });
        });
    });
  });

  // ==========================================
  // PUT /user/profile
  // ==========================================
  describe('PUT /api/v1/user/profile', () => {
    it('should update profile (200)', async () => {
      const user = TestData.user({ firstName: 'Updated' });
      mockUpdateProfile.execute.mockResolvedValue(user);

      await request(app.getHttpServer())
        .put('/api/v1/user/profile')
        .set('Authorization', 'Bearer mock.token')
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(mockUpdateProfile.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: TEST_USER.id, firstName: 'Updated' }),
      );
    });
  });

  // ==========================================
  // DELETE /user/avatar
  // ==========================================
  describe('POST /api/v1/user/avatar', () => {
    it('should return mobile-safe storage failure metadata (503)', async () => {
      mockUploadService.uploadAvatar.mockRejectedValue(
        new Error('avatar bucket unavailable'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/user/avatar')
        .set('Authorization', 'Bearer mock.token')
        .attach('avatar', Buffer.from('avatar-bytes'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(503)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            success: false,
            error: {
              code: 'AVATAR_STORAGE_UNAVAILABLE',
              dependency: 'avatar_storage',
              retryable: true,
              supportReviewRequired: false,
            },
            meta: {
              path: '/api/v1/user/avatar',
              method: 'POST',
            },
          });
        });
    });
  });

  describe('DELETE /api/v1/user/avatar', () => {
    it('should remove avatar (200)', async () => {
      mockUserRepository.findById.mockResolvedValue({
        avatarUrl: 'https://example.com/avatar.jpg',
        updateAvatar: jest.fn(),
      });
      mockUserRepository.save.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/user/avatar')
        .set('Authorization', 'Bearer mock.token')
        .expect(200);
    });
  });

  describe('GET /api/v1/user/avatar/:userId', () => {
    it('should return mobile-safe storage failure metadata (503)', async () => {
      mockUploadService.getFileBuffer.mockRejectedValue(
        new Error('avatar storage timeout'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/user/avatar/550e8400-e29b-41d4-a716-446655440000')
        .expect(503)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            success: false,
            error: {
              code: 'AVATAR_STORAGE_UNAVAILABLE',
              dependency: 'avatar_storage',
              retryable: true,
              supportReviewRequired: false,
            },
            meta: {
              path: '/api/v1/user/avatar/550e8400-e29b-41d4-a716-446655440000',
              method: 'GET',
            },
          });
        });
    });
  });

  // ==========================================
  // GET /user/username/check/:username
  // ==========================================
  describe('GET /api/v1/user/username/check/:username', () => {
    it('should check username availability (200)', async () => {
      mockUsernameUsecase.checkAvailability.mockResolvedValue({
        available: true,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/user/username/check/testname')
        .set('Authorization', 'Bearer mock.token')
        .expect(200);
    });
  });

  // ==========================================
  // GET /user/limits
  // ==========================================
  describe('GET /api/v1/user/limits', () => {
    it('should return user limits (200)', async () => {
      mockGetUserLimits.execute.mockResolvedValue({
        dailyTransferLimit: 5000,
        monthlyTransferLimit: 50000,
        singleTransferLimit: 2000,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/user/limits')
        .set('Authorization', 'Bearer mock.token')
        .expect(200);
    });
  });
});
