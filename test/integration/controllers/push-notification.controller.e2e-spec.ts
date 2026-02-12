/**
 * Push Notification Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockPushService = {
  registerDevice: jest.fn(),
  unregisterDevice: jest.fn(),
};

import { PushNotificationController } from '@modules/notification/application/controllers/push-notification.controller';
import { PushNotificationService } from '@modules/notification/application/services/push-notification.service';

describe('PushNotificationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [PushNotificationController],
      providers: [{ provide: PushNotificationService, useValue: mockPushService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/push-notifications/register', () => {
    it('should register device (200)', async () => {
      mockPushService.registerDevice.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/push-notifications/register')
        .send({ token: 'fcm_token_123', platform: 'ios' })
        .expect(200);
    });
  });

  describe('POST /api/v1/push-notifications/unregister', () => {
    it('should unregister device (200)', async () => {
      mockPushService.unregisterDevice.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/push-notifications/unregister')
        .send({ token: 'fcm_token_123' })
        .expect(200);
    });
  });
});
