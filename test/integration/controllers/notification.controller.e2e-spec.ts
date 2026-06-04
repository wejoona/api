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
    it('should list mobile-compatible notifications', async () => {
      mockGetUserNotifications.execute.mockResolvedValue({
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'transfer_received',
            presentationType: 'transfer',
            severity: 'success',
            action: 'open_transaction',
            status: 'delivered',
            title: 'Payment received',
            body: 'You received 50.00 USDC from Ama.',
            data: {
              transactionId: '123e4567-e89b-12d3-a456-426614174001',
            },
            referenceType: 'transaction',
            referenceId: '123e4567-e89b-12d3-a456-426614174001',
            sentAt: new Date('2026-06-04T10:30:00.000Z'),
            deliveredAt: new Date('2026-06-04T10:30:05.000Z'),
            readAt: null,
            createdAt: new Date('2026-06-04T10:30:00.000Z'),
            isUnread: true,
          },
        ],
        total: 1,
        unreadCount: 1,
        limit: 20,
        offset: 0,
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(200);

      expect(res.body).toEqual({
        notifications: [
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'transfer_received',
            presentationType: 'transfer',
            severity: 'success',
            action: 'open_transaction',
            status: 'delivered',
            title: 'Payment received',
            body: 'You received 50.00 USDC from Ama.',
            data: {
              transactionId: '123e4567-e89b-12d3-a456-426614174001',
            },
            referenceType: 'transaction',
            referenceId: '123e4567-e89b-12d3-a456-426614174001',
            sentAt: '2026-06-04T10:30:00.000Z',
            deliveredAt: '2026-06-04T10:30:05.000Z',
            readAt: null,
            createdAt: '2026-06-04T10:30:00.000Z',
            isUnread: true,
          }),
        ],
        total: 1,
        unreadCount: 1,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    it('should mark as read and return no content', async () => {
      mockMarkNotificationRead.execute.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .put('/api/v1/notifications/123/read')
        .expect(204);

      expect(mockMarkNotificationRead.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        notificationId: '123',
      });
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should mark all as read and return no content', async () => {
      mockMarkAllNotificationsRead.execute.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .put('/api/v1/notifications/read-all')
        .expect(204);

      expect(mockMarkAllNotificationsRead.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
      });
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should return unread count (200)', async () => {
      mockGetUnreadCount.execute.mockResolvedValue({ count: 5 });
      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread/count')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ count: 5 });
        });
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

  describe('POST /api/v1/notifications/push/token', () => {
    it('should accept the mobile FCM registration payload', async () => {
      mockRegisterDeviceToken.execute.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/push/token')
        .send({
          token: 'fcm-token-123',
          platform: 'ios',
          deviceId: 'device-123',
          deviceName: 'Ben iPhone',
          appVersion: '1.2.3',
          osVersion: 'iOS 18.0',
        })
        .expect(201);

      expect(res.body).toEqual({
        message: 'Push token registered successfully',
      });
      expect(mockRegisterDeviceToken.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        token: 'fcm-token-123',
        platform: 'ios',
        deviceId: 'device-123',
        deviceName: 'Ben iPhone',
      });
    });
  });

  describe('DELETE /api/v1/notifications/push/token', () => {
    it('should remove the mobile FCM token with no content response', async () => {
      mockUnregisterDeviceToken.execute.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/notifications/push/token')
        .send({ token: 'fcm-token-123' })
        .expect(204);

      expect(mockUnregisterDeviceToken.execute).toHaveBeenCalledWith({
        token: 'fcm-token-123',
      });
    });
  });

  describe('DELETE /api/v1/notifications/push/tokens', () => {
    it('should remove all mobile FCM tokens for the authenticated user', async () => {
      mockUnregisterAllDeviceTokens.execute.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/notifications/push/tokens')
        .expect(204);

      expect(mockUnregisterAllDeviceTokens.execute).toHaveBeenCalledWith({
        userId: TEST_USER.id,
      });
    });
  });
});
