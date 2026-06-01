/**
 * Risk Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockRiskService = {
  getUserRiskProfile: jest.fn(),
  registerDevice: jest.fn(),
};

import { RiskController } from '@modules/risk/application/controllers/risk.controller';
import { TransactionRiskService } from '@modules/risk/application/services/transaction-risk.service';

describe('RiskController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [RiskController],
      providers: [
        { provide: TransactionRiskService, useValue: mockRiskService },
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

  describe('GET /api/v1/risk/profile', () => {
    it('should return risk profile (200)', async () => {
      mockRiskService.getUserRiskProfile.mockResolvedValue({
        riskScore: 15,
        riskLevel: 'low',
      });
      await request(app.getHttpServer())
        .get('/api/v1/risk/profile')
        .expect(200);
    });
  });

  describe('POST /api/v1/risk/session', () => {
    it('should assess session risk (200)', async () => {
      mockRiskService.registerDevice.mockResolvedValue({
        isKnownDevice: true,
        deviceTrustScore: 90,
      });
      mockRiskService.getUserRiskProfile.mockResolvedValue({
        riskScore: 10,
        riskLevel: 'low',
      });
      await request(app.getHttpServer())
        .post('/api/v1/risk/session')
        .send({
          deviceFingerprint: 'device-1',
          appVersion: '1.0.0',
          ipAddress: '127.0.0.1',
        })
        .expect(200);
    });
  });
});
