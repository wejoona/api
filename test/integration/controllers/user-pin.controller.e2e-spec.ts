/**
 * User PIN Controller Integration Tests
 *
 * Tests: POST /user/pin/set, /user/pin/change, /user/pin/verify, /user/pin/reset
 */

import { INestApplication, forwardRef } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockSetPin = { execute: jest.fn() };
const mockChangePin = { execute: jest.fn() };
const mockVerifyPin = { execute: jest.fn() };
const mockResetPin = { execute: jest.fn() };
const mockGetProfile = { execute: jest.fn() };
const mockUpdateProfile = { execute: jest.fn() };
const mockUsernameUsecase = {
  checkAvailability: jest.fn(),
  search: jest.fn(),
  findByUsername: jest.fn(),
};
const mockGetUserLimits = { execute: jest.fn() };
const mockUploadService = {
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
};
const mockUserRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};
const PIN_HASH =
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
const NEW_PIN_HASH =
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

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

describe('User PIN (e2e)', () => {
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
    jest.clearAllMocks();
  });

  describe('POST /api/v1/user/pin/set', () => {
    it('should set PIN (200)', async () => {
      mockSetPin.execute.mockResolvedValue({ success: true });

      await request(app.getHttpServer())
        .post('/api/v1/user/pin/set')
        .send({ pinHash: PIN_HASH })
        .expect(200);

      expect(mockSetPin.execute).toHaveBeenCalled();
    });

    it('should return 400 for missing pin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/user/pin/set')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/user/pin/change', () => {
    it('should change PIN (200)', async () => {
      mockChangePin.execute.mockResolvedValue({ success: true });

      await request(app.getHttpServer())
        .post('/api/v1/user/pin/change')
        .send({ oldPinHash: PIN_HASH, newPinHash: NEW_PIN_HASH })
        .expect(200);

      expect(mockChangePin.execute).toHaveBeenCalled();
    });

    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/user/pin/change')
        .send({ oldPinHash: PIN_HASH })
        .expect(400);
    });
  });

  describe('POST /api/v1/user/pin/verify', () => {
    it('should verify PIN (200)', async () => {
      mockVerifyPin.execute.mockResolvedValue({
        success: true,
        pinToken: 'mock-pin-token',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/user/pin/verify')
        .send({ pinHash: PIN_HASH })
        .expect(200);
    });

    it('should return 400 for missing pin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/user/pin/verify')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/user/pin/reset', () => {
    it('should reset PIN (200)', async () => {
      mockResetPin.execute.mockResolvedValue({ success: true });

      await request(app.getHttpServer())
        .post('/api/v1/user/pin/reset')
        .send({ otp: '123456', newPinHash: NEW_PIN_HASH })
        .expect(200);
    });
  });
});
