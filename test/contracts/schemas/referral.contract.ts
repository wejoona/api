import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  required,
} from './types';

export const ReferralEntrySchema: ContractSchema = {
  name: 'ReferralEntry',
  description: 'Single referral history item',
  fields: {
    id: required(FieldType.UUID, {
      example: '550e8400-e29b-41d4-a716-446655440111',
    }),
    referrerId: required(FieldType.UUID, {
      example: '550e8400-e29b-41d4-a716-446655440010',
    }),
    referredId: nullable(FieldType.UUID, {
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    referralCode: required(FieldType.STRING, { example: 'REF123' }),
    status: required(FieldType.STRING, {
      enum: ['pending', 'completed', 'rewarded', 'expired'],
      example: 'pending',
    }),
    referrerReward: required(FieldType.STRING, { example: '1000000' }),
    referredReward: required(FieldType.STRING, { example: '500000' }),
    rewardCurrency: required(FieldType.STRING, { example: 'USDC' }),
    completedAt: nullable(FieldType.DATE, {
      example: '2026-06-04T10:00:00.000Z',
    }),
    rewardedAt: nullable(FieldType.DATE, {
      example: '2026-06-04T10:00:00.000Z',
    }),
    expiresAt: nullable(FieldType.DATE, {
      example: '2026-07-04T10:00:00.000Z',
    }),
    createdAt: required(FieldType.DATE, {
      example: '2026-06-04T10:00:00.000Z',
    }),
  },
};

export const ReferralSummarySchema: ContractSchema = {
  name: 'ReferralSummary',
  description:
    'Mobile referrals dashboard response. Must remain an object, not a raw array.',
  fields: {
    referralCode: required(FieldType.STRING, { example: 'REF123' }),
    referralLink: required(FieldType.STRING, {
      example: 'https://joonapay.com/invite/REF123',
    }),
    totalReferrals: required(FieldType.NUMBER, { example: 5 }),
    successfulReferrals: required(FieldType.NUMBER, { example: 3 }),
    totalEarned: required(FieldType.NUMBER, { example: 25 }),
    currency: required(FieldType.STRING, { example: 'USDC' }),
    referrals: required(FieldType.ARRAY, {
      itemType: ReferralEntrySchema,
    }),
  },
};

export const ReferralHistoryResponseSchema: ContractSchema = {
  name: 'ReferralHistoryResponse',
  description: 'Raw referral history array wrapped for contract validation',
  fields: {
    items: required(FieldType.ARRAY, {
      itemType: ReferralEntrySchema,
    }),
  },
};

export const ReferralCodeResponseSchema: ContractSchema = {
  name: 'ReferralCodeResponse',
  description: 'Current user referral code and share link',
  fields: {
    code: required(FieldType.STRING, { example: 'REF123' }),
    link: required(FieldType.STRING, {
      example: 'https://joonapay.com/invite/REF123',
    }),
  },
};

export const ReferralStatsResponseSchema: ContractSchema = {
  name: 'ReferralStatsResponse',
  description: 'Current user referral aggregate stats',
  fields: {
    referralCode: required(FieldType.STRING, { example: 'REF123' }),
    totalReferrals: required(FieldType.NUMBER, { example: 5 }),
    completedReferrals: required(FieldType.NUMBER, { example: 3 }),
    pendingReferrals: required(FieldType.NUMBER, { example: 2 }),
    totalEarnings: required(FieldType.STRING, { example: '25000000' }),
    pendingEarnings: required(FieldType.STRING, { example: '0' }),
    earningsCurrency: required(FieldType.STRING, { example: 'USDC' }),
    tier: required(FieldType.STRING, { example: 'bronze' }),
    referralLink: required(FieldType.STRING, {
      example: 'https://joonapay.com/invite/REF123',
    }),
  },
};

export const ReferralEndpoints: EndpointContract[] = [
  {
    method: 'GET',
    path: '/referrals',
    description: 'Get mobile referral dashboard summary',
    auth: 'bearer',
    responses: {
      200: ReferralSummarySchema,
    },
  },
  {
    method: 'GET',
    path: '/referrals/history',
    description: 'Get raw referral history array',
    auth: 'bearer',
    responses: {
      200: ReferralHistoryResponseSchema,
    },
  },
  {
    method: 'GET',
    path: '/referrals/code',
    description: 'Get or generate current user referral code',
    auth: 'bearer',
    responses: {
      200: ReferralCodeResponseSchema,
    },
  },
  {
    method: 'GET',
    path: '/referrals/stats',
    description: 'Get current user referral aggregate stats',
    auth: 'bearer',
    responses: {
      200: ReferralStatsResponseSchema,
    },
  },
];

export const ReferralContractGroup: ContractGroup = {
  name: 'Referrals',
  basePath: '/referrals',
  description: 'Mobile referral summary, history, code, and stats endpoints',
  endpoints: ReferralEndpoints,
};
