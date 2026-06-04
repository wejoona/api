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
  const userId = '550e8400-e29b-41d4-a716-446655440000';

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
          userId,
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/user/notification-preferences')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          pushEnabled: true,
          channels: expect.objectContaining({ push: true, inApp: true }),
          categories: expect.objectContaining({
            transaction: true,
            marketing: false,
          }),
        }),
      );
      expect(mockGetPreferences.execute).toHaveBeenCalledWith({ userId });
    });

    it('should support the mobile /notifications/preferences alias', async () => {
      mockGetPreferences.execute.mockResolvedValue(
        NotificationPreferences.create({ userId }),
      );

      await request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .expect(200)
        .expect((response) => {
          expect(response.body.pushMarketing).toBe(false);
          expect(response.body.channels).toEqual(
            expect.objectContaining({ push: true, email: true, sms: true }),
          );
        });
    });
  });

  describe('PUT /api/v1/user/notification-preferences', () => {
    it('should update preferences (200)', async () => {
      mockUpdatePreferences.execute.mockResolvedValue(
        NotificationPreferences.create({
          userId,
        }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/user/notification-preferences')
        .send({ pushEnabled: false, emailEnabled: true })
        .expect(200);

      expect(mockUpdatePreferences.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          pushEnabled: false,
          emailEnabled: true,
        }),
      );
    });

    it('should support mobile /notifications/preferences with flat payload', async () => {
      mockUpdatePreferences.execute.mockResolvedValue(
        NotificationPreferences.create({ userId }),
      );

      await request(app.getHttpServer())
        .put('/api/v1/notifications/preferences')
        .send({ pushMarketing: true, lowBalanceThreshold: 25 })
        .expect(200);

      expect(mockUpdatePreferences.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          pushMarketing: true,
          lowBalanceThreshold: 25,
        }),
      );
    });

    it('should accept grouped mobile channels and categories payload', async () => {
      mockUpdatePreferences.execute.mockResolvedValue(
        NotificationPreferences.create({ userId }),
      );

      await request(app.getHttpServer())
        .put('/api/v1/notifications/preferences')
        .send({
          channels: { push: false, email: true, sms: true },
          categories: {
            transaction: false,
            security: true,
            marketing: true,
            system: false,
          },
        })
        .expect(200);

      expect(mockUpdatePreferences.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          pushEnabled: false,
          emailEnabled: true,
          smsEnabled: true,
          pushTransactions: false,
          emailTransactions: false,
          smsTransactions: false,
          pushSecurity: true,
          smsSecurity: true,
          pushMarketing: true,
          emailMarketing: true,
          emailMonthlyStatement: false,
        }),
      );
    });
  });
});
