/**
 * Liveness Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockLivenessService = {
  startSession: jest.fn(),
  submitChallenge: jest.fn(),
  getSessionStatus: jest.fn(),
};

import { LivenessController } from '@modules/liveness/application/controllers/liveness.controller';
import { LivenessService } from '@modules/liveness/application/services/liveness.service';

describe('LivenessController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [LivenessController],
      providers: [{ provide: LivenessService, useValue: mockLivenessService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/liveness/start', () => {
    it('should create liveness session (200)', async () => {
      mockLivenessService.startSession.mockResolvedValue({
        sessionId: '550e8400-e29b-41d4-a716-446655440010',
        currentChallenge: {
          challengeId: '550e8400-e29b-41d4-a716-446655440011',
        },
      });
      await request(app.getHttpServer())
        .post('/api/v1/liveness/start')
        .expect(200);
    });
  });

  describe('POST /api/v1/liveness/challenge', () => {
    it('should submit challenge (200)', async () => {
      mockLivenessService.submitChallenge.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/liveness/challenge')
        .send({
          sessionId: '550e8400-e29b-41d4-a716-446655440010',
          challengeId: '550e8400-e29b-41d4-a716-446655440011',
          videoFrameBase64: 'data:image/jpeg;base64,abc',
        })
        .expect(200);
    });
  });

  describe('GET /api/v1/liveness/:sessionId', () => {
    it('should get liveness status (200)', async () => {
      mockLivenessService.getSessionStatus.mockResolvedValue({
        sessionId: '550e8400-e29b-41d4-a716-446655440010',
        status: 'completed',
      });
      await request(app.getHttpServer())
        .get('/api/v1/liveness/550e8400-e29b-41d4-a716-446655440010')
        .expect(200);
    });

    it('should return a mobile-safe 404 envelope when session is missing', async () => {
      mockLivenessService.getSessionStatus.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/liveness/550e8400-e29b-41d4-a716-446655440010')
        .expect(404);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Liveness session not found or expired',
          }),
        }),
      );
    });
  });
});
