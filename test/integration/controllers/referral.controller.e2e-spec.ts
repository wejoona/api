/**
 * Referral Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockReferralService = {
  getReferralCode: jest.fn(),
  getReferralStats: jest.fn(),
  getLeaderboard: jest.fn(),
  applyReferralCode: jest.fn(),
};

import { ReferralController } from '@modules/referral/application/controllers/referral.controller';
import { ReferralService } from '@modules/referral/application/services/referral.service';

describe('ReferralController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ReferralController],
      providers: [{ provide: ReferralService, useValue: mockReferralService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/referrals/code', () => {
    it('should return referral code (200)', async () => {
      mockReferralService.getReferralCode.mockResolvedValue({ code: 'REF123' });
      await request(app.getHttpServer()).get('/api/v1/referrals/code').expect(200);
    });
  });

  describe('GET /api/v1/referrals/stats', () => {
    it('should return referral stats (200)', async () => {
      mockReferralService.getReferralStats.mockResolvedValue({ totalReferrals: 5, earnings: 25 });
      await request(app.getHttpServer()).get('/api/v1/referrals/stats').expect(200);
    });
  });

  describe('GET /api/v1/referrals/leaderboard', () => {
    it('should return leaderboard (200)', async () => {
      mockReferralService.getLeaderboard.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/referrals/leaderboard').expect(200);
    });
  });

  describe('POST /api/v1/referrals/apply', () => {
    it('should apply referral code (200)', async () => {
      mockReferralService.applyReferralCode.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/referrals/apply')
        .send({ code: 'REF123' })
        .expect(200);
    });
  });
});
