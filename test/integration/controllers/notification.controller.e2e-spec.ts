/**
 * Notification Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockGetUserNotifications = { execute: jest.fn() };
const mockMarkNotificationRead = { execute: jest.fn() };
const mockMarkAllNotificationsRead = { execute: jest.fn() };
const mockRegisterDeviceToken = { execute: jest.fn() };
const mockUnregisterDeviceToken = { execute: jest.fn() };
const mockUnregisterAllDeviceTokens = { execute: jest.fn() };
const mockGetUnreadCount = { execute: jest.fn() };

import { NotificationController } from '@modules/notification/application/controllers/notification.controller';
import {
  GetUserNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  UnregisterAllDeviceTokensUseCase,
  GetUnreadCountUseCase,
} from '@modules/notification/application/domain/usecases';

describe('NotificationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [NotificationController],
      providers: [
        { provide: GetUserNotificationsUseCase, useValue: mockGetUserNotifications },
        { provide: MarkNotificationReadUseCase, useValue: mockMarkNotificationRead },
        { provide: MarkAllNotificationsReadUseCase, useValue: mockMarkAllNotificationsRead },
        { provide: RegisterDeviceTokenUseCase, useValue: mockRegisterDeviceToken },
        { provide: UnregisterDeviceTokenUseCase, useValue: mockUnregisterDeviceToken },
        { provide: UnregisterAllDeviceTokensUseCase, useValue: mockUnregisterAllDeviceTokens },
        { provide: GetUnreadCountUseCase, useValue: mockGetUnreadCount },
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

  describe('GET /api/v1/notifications', () => {
    it('should list notifications (200)', async () => {
      mockGetUserNotifications.execute.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
        limit: 20,
        offset: 0,
      });
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(200);
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    it('should mark as read (200)', async () => {
      mockMarkNotificationRead.execute.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .put('/api/v1/notifications/123/read')
        .expect(204);
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should mark all as read (200)', async () => {
      mockMarkAllNotificationsRead.execute.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .put('/api/v1/notifications/read-all')
        .expect(204);
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should return unread count (200)', async () => {
      mockGetUnreadCount.execute.mockResolvedValue({ count: 5 });
      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread/count')
        .expect(200);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count through the mobile-compatible alias (200)', async () => {
      mockGetUnreadCount.execute.mockResolvedValue({ count: 7 });

      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ count: 7 });
        });

      expect(mockGetUnreadCount.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
      });
    });
  });
});
