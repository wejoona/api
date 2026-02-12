/**
 * Session Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockSessionService = {
  getActiveSessions: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
};

import { SessionController } from '@modules/session/application/controllers/session.controller';
import { SessionService } from '@modules/session/application/services/session.service';

describe('SessionController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/sessions', () => {
    it('should list active sessions (200)', async () => {
      mockSessionService.getActiveSessions.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/sessions').expect(200);
    });
  });

  describe('DELETE /api/v1/sessions/:id', () => {
    it('should revoke session (200)', async () => {
      mockSessionService.revokeSession.mockResolvedValue({ success: true });
      await request(app.getHttpServer()).delete('/api/v1/sessions/sess_123').expect(200);
    });
  });

  describe('DELETE /api/v1/sessions', () => {
    it('should revoke all sessions (200)', async () => {
      mockSessionService.revokeAllSessions.mockResolvedValue({ count: 3 });
      await request(app.getHttpServer()).delete('/api/v1/sessions').expect(200);
    });
  });
});
