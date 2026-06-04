/**
 * Feature flag contracts used by mobile bootstrap.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  optional,
  required,
} from './types';

export const FeatureFlagsResponseSchema: ContractSchema = {
  name: 'FeatureFlagsResponse',
  description:
    'Flat feature flag map. Mobile parses this as Map<String, bool>.',
  fields: {
    deposit: optional(FieldType.BOOLEAN, { example: true }),
    send: optional(FieldType.BOOLEAN, { example: true }),
    receive: optional(FieldType.BOOLEAN, { example: true }),
    transactions: optional(FieldType.BOOLEAN, { example: true }),
    kyc: optional(FieldType.BOOLEAN, { example: true }),
    withdraw: optional(FieldType.BOOLEAN, { example: false }),
    off_ramp: optional(FieldType.BOOLEAN, { example: false }),
    airtime: optional(FieldType.BOOLEAN, { example: false }),
    bills: optional(FieldType.BOOLEAN, { example: false }),
    savings: optional(FieldType.BOOLEAN, { example: false }),
    virtual_cards: optional(FieldType.BOOLEAN, { example: false }),
    split_bills: optional(FieldType.BOOLEAN, { example: false }),
    recurring_transfers: optional(FieldType.BOOLEAN, { example: false }),
    budget: optional(FieldType.BOOLEAN, { example: false }),
    agent_network: optional(FieldType.BOOLEAN, { example: false }),
    ussd: optional(FieldType.BOOLEAN, { example: false }),
    referrals: optional(FieldType.BOOLEAN, { example: false }),
    referral_program: optional(FieldType.BOOLEAN, { example: false }),
    analytics: optional(FieldType.BOOLEAN, { example: false }),
    currency_converter: optional(FieldType.BOOLEAN, { example: false }),
    request_money: optional(FieldType.BOOLEAN, { example: false }),
    scheduled_transfers: optional(FieldType.BOOLEAN, { example: false }),
    saved_recipients: optional(FieldType.BOOLEAN, { example: false }),
    merchant_qr: optional(FieldType.BOOLEAN, { example: false }),
    payment_links: optional(FieldType.BOOLEAN, { example: false }),
    two_factor_auth: optional(FieldType.BOOLEAN, { example: false }),
    external_transfers: optional(FieldType.BOOLEAN, { example: false }),
    bill_payments: optional(FieldType.BOOLEAN, { example: false }),
    savings_pots: optional(FieldType.BOOLEAN, { example: false }),
    biometric_auth: optional(FieldType.BOOLEAN, { example: false }),
    mobile_money_withdrawals: optional(FieldType.BOOLEAN, {
      example: false,
    }),
  },
};

export const FeatureFlagCheckResponseSchema: ContractSchema = {
  name: 'FeatureFlagCheckResponse',
  description: 'Single feature flag evaluation result',
  fields: {
    key: required(FieldType.STRING, { example: 'payment_links' }),
    enabled: required(FieldType.BOOLEAN, { example: true }),
  },
};

export const FeatureFlagDependencyUnavailableSchema: ContractSchema = {
  name: 'FeatureFlagDependencyUnavailable',
  description:
    'Mobile-safe feature flag dependency failure. Mobile should keep cached/default flags.',
  fields: {
    success: required(FieldType.BOOLEAN, { example: false }),
    error: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'FeatureFlagDependencyUnavailableError',
        fields: {
          code: required(FieldType.STRING, {
            example: 'FEATURE_FLAG_DEPENDENCY_UNAVAILABLE',
          }),
          message: required(FieldType.STRING, {
            example:
              'Feature flags are temporarily unavailable. Cached app defaults may be used.',
          }),
          dependency: required(FieldType.STRING, {
            example: 'feature_flag_store',
          }),
          retryable: required(FieldType.BOOLEAN, { example: true }),
          supportReviewRequired: required(FieldType.BOOLEAN, {
            example: false,
          }),
        },
      },
    }),
    meta: required(FieldType.OBJECT),
  },
};

export const GetMyFeatureFlagsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/feature-flags/me',
  description: 'Get feature flags evaluated for the current user context',
  auth: 'bearer',
  queryParams: {
    name: 'FeatureFlagsQuery',
    fields: {
      appVersion: optional(FieldType.STRING, { example: '1.0.0' }),
      platform: optional(FieldType.STRING, { example: 'ios' }),
    },
  },
  responses: {
    200: FeatureFlagsResponseSchema,
    503: FeatureFlagDependencyUnavailableSchema,
  },
};

export const CheckFeatureFlagEndpoint: EndpointContract = {
  method: 'GET',
  path: '/feature-flags/check/:key',
  description: 'Check one feature flag for the current user context',
  auth: 'bearer',
  pathParams: {
    key: required(FieldType.STRING, { example: 'payment_links' }),
  },
  queryParams: {
    name: 'FeatureFlagCheckQuery',
    fields: {
      appVersion: optional(FieldType.STRING, { example: '1.0.0' }),
      platform: optional(FieldType.STRING, { example: 'ios' }),
    },
  },
  responses: {
    200: FeatureFlagCheckResponseSchema,
    503: FeatureFlagDependencyUnavailableSchema,
  },
};

export const FeatureFlagContractGroup: ContractGroup = {
  name: 'Feature Flags',
  basePath: '/feature-flags',
  description: 'Mobile bootstrap feature flag endpoints',
  endpoints: [GetMyFeatureFlagsEndpoint, CheckFeatureFlagEndpoint],
};
