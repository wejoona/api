/**
 * Push Notification Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockPushService = {
  registerToken: jest.fn(),
  removeToken: jest.fn(),
};

import { PushNotificationController } from '@modules/notification/application/controllers/push-notification.controller';
import { PushNotificationService } from '@modules/notification/application/domain/services/push-notification.service';

describe('PushNotificationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [PushNotificationController],
      providers: [
        { provide: PushNotificationService, useValue: mockPushService },
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

  describe('POST /api/v1/notifications/push/token', () => {
    it('should register device (200)', async () => {
      mockPushService.registerToken.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/notifications/push/token')
        .send({ token: 'fcm_token_123', platform: 'ios', deviceId: 'device-1' })
        .expect(201);
    });
  });

  describe('DELETE /api/v1/notifications/push/token', () => {
    it('should unregister device (200)', async () => {
      mockPushService.removeToken.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .delete('/api/v1/notifications/push/token')
        .send({ token: 'fcm_token_123' })
        .expect(200);
    });
  });
});
