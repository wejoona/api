/**
 * Notification Preferences Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockGetPreferences = { execute: jest.fn() };
const mockUpdatePreferences = { execute: jest.fn() };

import { NotificationPreferencesController } from '@modules/user-preferences/application/controllers/notification-preferences.controller';
import {
  GetNotificationPreferencesUsecase,
  UpdateNotificationPreferencesUsecase,
} from '@modules/user-preferences/application/domain/usecases';
import { NotificationPreferences } from '@modules/user-preferences/application/domain/entities';

describe('NotificationPreferencesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [NotificationPreferencesController],
      providers: [
        {
          provide: GetNotificationPreferencesUsecase,
          useValue: mockGetPreferences,
        },
        {
          provide: UpdateNotificationPreferencesUsecase,
          useValue: mockUpdatePreferences,
        },
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

  describe('GET /api/v1/user/notification-preferences', () => {
    it('should return preferences (200)', async () => {
      mockGetPreferences.execute.mockResolvedValue(
        NotificationPreferences.create({
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      );
      await request(app.getHttpServer())
        .get('/api/v1/user/notification-preferences')
        .expect(200);
    });
  });

  describe('PUT /api/v1/user/notification-preferences', () => {
    it('should update preferences (200)', async () => {
      mockUpdatePreferences.execute.mockResolvedValue(
        NotificationPreferences.create({
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/user/notification-preferences')
        .send({ pushEnabled: false, emailEnabled: true })
        .expect(200);
    });
  });
});
