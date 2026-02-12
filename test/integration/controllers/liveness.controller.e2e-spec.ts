/**
 * Liveness Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockLivenessService = {
  createSession: jest.fn(),
  submitChallenge: jest.fn(),
  getStatus: jest.fn(),
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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/liveness/session', () => {
    it('should create liveness session (201)', async () => {
      mockLivenessService.createSession.mockResolvedValue({ sessionId: 'ls_123', challengeUrl: 'https://...' });
      await request(app.getHttpServer()).post('/api/v1/liveness/session').expect(201);
    });
  });

  describe('POST /api/v1/liveness/challenge', () => {
    it('should submit challenge (200)', async () => {
      mockLivenessService.submitChallenge.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/liveness/challenge')
        .send({ sessionId: 'ls_123', response: 'data' })
        .expect(200);
    });
  });

  describe('GET /api/v1/liveness/status', () => {
    it('should get liveness status (200)', async () => {
      mockLivenessService.getStatus.mockResolvedValue({ verified: true });
      await request(app.getHttpServer()).get('/api/v1/liveness/status').expect(200);
    });
  });
});
