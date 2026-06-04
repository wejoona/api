import {
  ReferralCodeResponseSchema,
  ReferralHistoryResponseSchema,
  ReferralStatsResponseSchema,
  ReferralSummarySchema,
} from '../schemas/referral.contract';
import { validateSchema } from '../validators/schema-validator';

const referralEntry = {
  id: '550e8400-e29b-41d4-a716-446655440111',
  referrerId: '550e8400-e29b-41d4-a716-446655440010',
  referredId: '550e8400-e29b-41d4-a716-446655440000',
  referralCode: 'REF123',
  status: 'pending',
  referrerReward: '1000000',
  referredReward: '500000',
  rewardCurrency: 'USDC',
  completedAt: null,
  rewardedAt: null,
  expiresAt: '2026-07-04T10:00:00.000Z',
  createdAt: '2026-06-04T10:00:00.000Z',
};

describe('Referral Contracts', () => {
  it('should validate GET /referrals as the mobile summary object', () => {
    const response = {
      referralCode: 'REF123',
      referralLink: 'https://joonapay.com/invite/REF123',
      totalReferrals: 5,
      successfulReferrals: 3,
      totalEarned: 25,
      currency: 'USDC',
      referrals: [referralEntry],
    };

    const result = validateSchema(response, ReferralSummarySchema);
    expect(result.valid).toBe(true);
    expect(Array.isArray(response)).toBe(false);
  });

  it('should reject raw arrays for GET /referrals because mobile expects a map', () => {
    const response = [referralEntry];

    const result = validateSchema(response, ReferralSummarySchema);
    expect(result.valid).toBe(false);
  });

  it('should validate GET /referrals/history as raw history items', () => {
    const response = {
      items: [referralEntry],
    };

    const result = validateSchema(response, ReferralHistoryResponseSchema);
    expect(result.valid).toBe(true);
  });

  it('should validate GET /referrals/code', () => {
    const response = {
      code: 'REF123',
      link: 'https://joonapay.com/invite/REF123',
    };

    const result = validateSchema(response, ReferralCodeResponseSchema);
    expect(result.valid).toBe(true);
  });

  it('should validate GET /referrals/stats', () => {
    const response = {
      referralCode: 'REF123',
      totalReferrals: 5,
      completedReferrals: 3,
      pendingReferrals: 2,
      totalEarnings: '25000000',
      pendingEarnings: '0',
      earningsCurrency: 'USDC',
      tier: 'bronze',
      referralLink: 'https://joonapay.com/invite/REF123',
    };

    const result = validateSchema(response, ReferralStatsResponseSchema);
    expect(result.valid).toBe(true);
  });
});
