/**
 * Step-Up Auth Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockStepUpService = {
  evaluateTransaction: jest.fn(),
  verifyOtp: jest.fn(),
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

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/step-up/transaction', () => {
    it('should evaluate transaction step-up (200)', async () => {
      mockStepUpService.evaluateTransaction.mockResolvedValue({
        flow: 'green',
        riskScore: 10,
        riskLevel: 'low',
        stepUpRequired: false,
        stepUpType: 'none',
        reason: 'low_risk',
        factors: [],
      });
      await request(app.getHttpServer())
        .post('/api/v1/step-up/transaction')
        .send({ type: 'transfer', amount: 100, currency: 'XOF' })
        .expect(200);
    });
  });

  describe('POST /api/v1/step-up/verify-otp', () => {
    it('should verify step-up OTP (200)', async () => {
      mockStepUpService.verifyOtp.mockResolvedValue({
        valid: true,
        stepUpType: 'otp',
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
      });
      await request(app.getHttpServer())
        .post('/api/v1/step-up/verify-otp')
        .send({ challengeToken: 'ch_123', code: '123456' })
        .expect(200);
    });
  });
});
