/**
 * Notification Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockNotificationService = {
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
  deleteNotification: jest.fn(),
};

import { NotificationController } from '@modules/notification/application/controllers/notification.controller';
import { NotificationService } from '@modules/notification/application/services/notification.service';

describe('NotificationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockNotificationService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/notifications', () => {
    it('should list notifications (200)', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({ notifications: [], total: 0 });
      await request(app.getHttpServer()).get('/api/v1/notifications').expect(200);
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    it('should mark as read (200)', async () => {
      mockNotificationService.markAsRead.mockResolvedValue({ success: true });
      await request(app.getHttpServer()).put('/api/v1/notifications/123/read').expect(200);
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should mark all as read (200)', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue({ success: true });
      await request(app.getHttpServer()).put('/api/v1/notifications/read-all').expect(200);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count (200)', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue({ count: 5 });
      await request(app.getHttpServer()).get('/api/v1/notifications/unread-count').expect(200);
    });
  });
});
