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
  getUserReferrals: jest.fn(),
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

  describe('GET /api/v1/referrals/capability', () => {
    it('should return mobile-safe capability metadata (200)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/referrals/capability')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            feature: 'referrals',
            available: true,
            status: 'available',
            reason: null,
            featureReason: null,
            provider: null,
            retryable: false,
            supportReviewRequired: false,
          });
        });

      expect(mockReferralService.getUserReferrals).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/referrals/code', () => {
    it('should return referral code (200)', async () => {
      mockReferralService.getUserReferralCode.mockResolvedValue('REF123');
      await request(app.getHttpServer())
        .get('/api/v1/referrals/code')
        .expect(200);
    });
  });

  describe('GET /api/v1/referrals', () => {
    it('should create a referral summary for fresh users without stats', async () => {
      mockReferralService.getUserStats.mockResolvedValue(null);
      mockReferralService.generateReferralCode.mockResolvedValue('NEW123');
      mockReferralService.getUserReferrals.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/referrals')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            referralCode: 'NEW123',
            referralLink: 'https://joonapay.com/invite/NEW123',
            totalReferrals: 0,
            successfulReferrals: 0,
            totalEarned: 0,
            currency: 'USDC',
            referrals: [],
          });
        });
    });

    it('should return the mobile referral summary object', async () => {
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
      mockReferralService.getUserReferrals.mockResolvedValue([referral()]);

      await request(app.getHttpServer())
        .get('/api/v1/referrals')
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(false);
          expect(body).toMatchObject({
            referralCode: 'REF123',
            referralLink: 'https://joonapay.com/invite/REF123',
            totalReferrals: 5,
            successfulReferrals: 3,
            totalEarned: 25,
            currency: 'USDC',
          });
          expect(body.referrals).toHaveLength(1);
          expect(body.referrals[0]).toMatchObject({
            id: '550e8400-e29b-41d4-a716-446655440111',
            referralCode: 'REF123',
            status: 'pending',
          });
        });
    });
  });

  describe('GET /api/v1/referrals/history', () => {
    it('should preserve the explicit history route', async () => {
      mockReferralService.getUserReferrals.mockResolvedValue([referral()]);

      await request(app.getHttpServer())
        .get('/api/v1/referrals/history')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(1);
          expect(body[0].referralCode).toBe('REF123');
        });
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
