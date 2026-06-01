/**
 * Referral Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockReferralService = {
  getUserReferralCode: jest.fn(),
  getUserStats: jest.fn(),
  generateReferralCode: jest.fn(),
  getLeaderboard: jest.fn(),
  applyReferralCode: jest.fn(),
};

import { ReferralController } from '@modules/referral/application/controllers/referral.controller';
import { ReferralService } from '@modules/referral/application/domain/services/referral.service';

function referral() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440111',
    referrerId: '550e8400-e29b-41d4-a716-446655440010',
    referredId: '550e8400-e29b-41d4-a716-446655440000',
    referralCode: 'REF123',
    status: 'pending',
    referrerReward: BigInt(1000000),
    referredReward: BigInt(500000),
    rewardCurrency: 'USDC',
    completedAt: null,
    rewardedAt: null,
    expiresAt: new Date(),
    createdAt: new Date(),
  };
}

describe('ReferralController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ReferralController],
      providers: [{ provide: ReferralService, useValue: mockReferralService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/referrals/code', () => {
    it('should return referral code (200)', async () => {
      mockReferralService.getUserReferralCode.mockResolvedValue('REF123');
      await request(app.getHttpServer())
        .get('/api/v1/referrals/code')
        .expect(200);
    });
  });

  describe('GET /api/v1/referrals/stats', () => {
    it('should return referral stats (200)', async () => {
      mockReferralService.getUserStats.mockResolvedValue({
        referralCode: 'REF123',
        totalReferrals: 5,
        completedReferrals: 3,
        pendingReferrals: 2,
        totalEarnings: BigInt(25000000),
        pendingEarnings: BigInt(0),
        earningsCurrency: 'USDC',
        tier: 'bronze',
      });
      await request(app.getHttpServer())
        .get('/api/v1/referrals/stats')
        .expect(200);
    });
  });

  describe('GET /api/v1/referrals/leaderboard', () => {
    it('should return leaderboard (200)', async () => {
      mockReferralService.getLeaderboard.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/referrals/leaderboard')
        .expect(200);
    });
  });

  describe('POST /api/v1/referrals/apply', () => {
    it('should apply referral code (200)', async () => {
      mockReferralService.applyReferralCode.mockResolvedValue({
        ...referral(),
      });
      await request(app.getHttpServer())
        .post('/api/v1/referrals/apply')
        .send({ code: 'REF123' })
        .expect(201);
    });
  });
});
