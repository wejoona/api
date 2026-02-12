/**
 * Risk Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockRiskService = {
  assessRisk: jest.fn(),
  getRiskScore: jest.fn(),
  getRiskHistory: jest.fn(),
};

import { RiskController } from '@modules/risk/application/controllers/risk.controller';
import { RiskService } from '@modules/risk/application/services/risk.service';

describe('RiskController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [RiskController],
      providers: [{ provide: RiskService, useValue: mockRiskService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/risk/score', () => {
    it('should return risk score (200)', async () => {
      mockRiskService.getRiskScore.mockResolvedValue({ score: 15, level: 'low' });
      await request(app.getHttpServer()).get('/api/v1/risk/score').expect(200);
    });
  });

  describe('POST /api/v1/risk/assess', () => {
    it('should assess risk (200)', async () => {
      mockRiskService.assessRisk.mockResolvedValue({ approved: true, score: 10 });
      await request(app.getHttpServer())
        .post('/api/v1/risk/assess')
        .send({ transactionType: 'transfer', amount: 100 })
        .expect(200);
    });
  });
});
