/**
 * Step-Up Auth Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockStepUpService = {
  initiateStepUp: jest.fn(),
  verifyStepUp: jest.fn(),
  getStatus: jest.fn(),
};

import { StepUpController } from '@modules/risk/application/controllers/step-up.controller';
import { StepUpService } from '@modules/risk/application/services/step-up.service';

describe('StepUpController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [StepUpController],
      providers: [{ provide: StepUpService, useValue: mockStepUpService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/step-up/initiate', () => {
    it('should initiate step-up (200)', async () => {
      mockStepUpService.initiateStepUp.mockResolvedValue({ challengeId: 'ch_123', method: 'otp' });
      await request(app.getHttpServer())
        .post('/api/v1/step-up/initiate')
        .send({ action: 'large_transfer' })
        .expect(200);
    });
  });

  describe('POST /api/v1/step-up/verify', () => {
    it('should verify step-up (200)', async () => {
      mockStepUpService.verifyStepUp.mockResolvedValue({ verified: true, token: 'step_tok' });
      await request(app.getHttpServer())
        .post('/api/v1/step-up/verify')
        .send({ challengeId: 'ch_123', response: '123456' })
        .expect(200);
    });
  });
});
