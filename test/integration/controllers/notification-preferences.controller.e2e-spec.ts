/**
 * Notification Preferences Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockNotifPrefService = {
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
};

import { NotificationPreferencesController } from '@modules/user-preferences/application/controllers/notification-preferences.controller';
import { NotificationPreferencesService } from '@modules/user-preferences/application/services/notification-preferences.service';

describe('NotificationPreferencesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [NotificationPreferencesController],
      providers: [{ provide: NotificationPreferencesService, useValue: mockNotifPrefService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/notification-preferences', () => {
    it('should return preferences (200)', async () => {
      mockNotifPrefService.getPreferences.mockResolvedValue({ push: true, email: false, sms: true });
      await request(app.getHttpServer()).get('/api/v1/notification-preferences').expect(200);
    });
  });

  describe('PUT /api/v1/notification-preferences', () => {
    it('should update preferences (200)', async () => {
      mockNotifPrefService.updatePreferences.mockResolvedValue({ push: false, email: true, sms: true });
      await request(app.getHttpServer())
        .put('/api/v1/notification-preferences')
        .send({ push: false, email: true })
        .expect(200);
    });
  });
});
