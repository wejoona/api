/**
 * Session Controller Integration Tests
 */
import { ForbiddenException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createUnauthTestApp } from '../setup/test-app';

const mockSessionService = {
  getActiveSessions: jest.fn(),
  getAllSessions: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
};

import { SessionController } from '@modules/session/application/controllers/session.controller';
import { SessionService } from '@modules/session/application/services/session.service';

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440010';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function createSession() {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    deviceId: '550e8400-e29b-41d4-a716-446655440321',
    ipAddress: '127.0.0.1',
    userAgent: 'Korido iOS',
    location: null,
    isActive: true,
    lastActivityAt: new Date('2026-06-04T10:00:00.000Z'),
    expiresAt: new Date('2026-06-11T10:00:00.000Z'),
    createdAt: new Date('2026-06-04T09:00:00.000Z'),
  };
}

describe('SessionController (e2e)', () => {
  let app: INestApplication;
  let unauthApp: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    });
    app = result.app;

    const unauthResult = await createUnauthTestApp({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    });
    unauthApp = unauthResult.app;
  });

  afterAll(async () => {
    await app?.close();
    await unauthApp?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/sessions', () => {
    it('should list mobile-compatible active sessions', async () => {
      mockSessionService.getActiveSessions.mockResolvedValue([createSession()]);
      const res = await request(app.getHttpServer())
        .get('/api/v1/sessions')
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({
          id: SESSION_ID,
          userId: USER_ID,
          deviceId: '550e8400-e29b-41d4-a716-446655440321',
          ipAddress: '127.0.0.1',
          userAgent: 'Korido iOS',
          isActive: true,
          lastActivityAt: '2026-06-04T10:00:00.000Z',
          expiresAt: '2026-06-11T10:00:00.000Z',
        }),
      ]);
    });

    it('should return a mobile-safe 401 envelope for expired access tokens', async () => {
      const res = await request(unauthApp.getHttpServer())
        .get('/api/v1/sessions')
        .set('Authorization', 'Bearer expired.token')
        .expect(401);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          }),
        }),
      );
    });
  });

  describe('DELETE /api/v1/sessions/:id', () => {
    it('should pass revoke reason and return stable action response', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${SESSION_ID}`)
        .send({ reason: 'user_revoke_device' })
        .expect(200);

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        USER_ID,
        SESSION_ID,
        'user_revoke_device',
      );
    });

    it('should return a mobile-safe 403 envelope for another user session', async () => {
      mockSessionService.revokeSession.mockRejectedValueOnce(
        new ForbiddenException('Session does not belong to user'),
      );

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${SESSION_ID}`)
        .send({ reason: 'user_revoke_device' })
        .expect(403);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Session does not belong to user',
          }),
        }),
      );
    });
  });

  describe('DELETE /api/v1/sessions', () => {
    it('should revoke all sessions and return action count', async () => {
      mockSessionService.revokeAllSessions.mockResolvedValue(3);
      const res = await request(app.getHttpServer())
        .delete('/api/v1/sessions')
        .send({ reason: 'user_logout_all_devices' })
        .expect(200);

      expect(mockSessionService.revokeAllSessions).toHaveBeenCalledWith(
        USER_ID,
        'user_logout_all_devices',
      );
      expect(res.body).toEqual({
        success: true,
        message: '3 session(s) revoked successfully',
        count: 3,
      });
    });
  });
});
