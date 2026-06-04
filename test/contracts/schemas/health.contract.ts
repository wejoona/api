/**
 * Health/readiness contracts used by mobile and dashboard clients.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  optional,
  optionalNullable,
  required,
} from './types';

export const ProviderModeSchema: ContractSchema = {
  name: 'ProviderMode',
  description: 'Sanitized provider mode metadata',
  fields: {
    provider: required(FieldType.STRING),
    mode: required(FieldType.STRING, {
      enum: ['mock', 'live', 'disabled'],
    }),
    productionLike: required(FieldType.BOOLEAN),
    mockAllowed: required(FieldType.BOOLEAN),
    liveConfigured: required(FieldType.BOOLEAN),
    modeStatus: required(FieldType.STRING, {
      enum: [
        'mock',
        'enabled',
        'disabled',
        'misconfigured',
        'ok',
        'review_required',
      ],
    }),
    enabled: optional(FieldType.BOOLEAN),
    entityConfigured: optional(FieldType.BOOLEAN),
    network: optional(FieldType.STRING),
    backend: optional(FieldType.STRING),
  },
};

export const DependencyReadinessSchema: ContractSchema = {
  name: 'DependencyReadiness',
  fields: {
    name: required(FieldType.STRING),
    status: required(FieldType.STRING, { enum: ['up', 'down', 'skipped'] }),
    available: required(FieldType.BOOLEAN),
    details: optional(FieldType.OBJECT),
    error: optional(FieldType.STRING),
    errorType: optional(FieldType.STRING),
    reason: optionalNullable(FieldType.STRING),
    providerMode: optional(FieldType.OBJECT, {
      nestedSchema: ProviderModeSchema,
    }),
  },
};

export const FeatureReadinessSchema: ContractSchema = {
  name: 'FeatureReadiness',
  fields: {
    available: required(FieldType.BOOLEAN),
    status: required(FieldType.STRING, {
      enum: ['available', 'unavailable'],
    }),
    provider: nullable(FieldType.STRING),
    reason: nullable(FieldType.STRING),
  },
};

export const MockBackedProviderStatusSchema: ContractSchema = {
  name: 'MockBackedProviderStatus',
  fields: {
    mode: required(FieldType.STRING, { enum: ['mock', 'disabled'] }),
    productionLike: required(FieldType.BOOLEAN),
    mockAllowed: required(FieldType.BOOLEAN),
    liveConfigured: required(FieldType.BOOLEAN),
    available: required(FieldType.BOOLEAN),
    status: required(FieldType.STRING, {
      enum: ['mock', 'unavailable', 'misconfigured'],
    }),
    reason: nullable(FieldType.STRING),
    featureReason: nullable(FieldType.STRING),
  },
};

export const MobileReadinessSchema: ContractSchema = {
  name: 'MobileReadiness',
  description: 'Mobile and dashboard API readiness response',
  fields: {
    status: required(FieldType.STRING, {
      enum: ['ready', 'degraded', 'not_ready'],
    }),
    checkedAt: required(FieldType.DATE),
    app: required(FieldType.OBJECT),
    providers: required(FieldType.OBJECT),
    features: required(FieldType.OBJECT),
    risk: required(FieldType.OBJECT),
    kyc: required(FieldType.OBJECT),
    messaging: required(FieldType.OBJECT),
  },
};

export const GetMobileReadinessEndpoint: EndpointContract = {
  method: 'GET',
  path: '/health/mobile-readiness',
  description: 'Get mobile/API readiness split by app, providers, and features',
  auth: 'none',
  responses: {
    200: MobileReadinessSchema,
  },
};

export const HealthContractGroup: ContractGroup = {
  name: 'Health',
  basePath: '/health',
  description: 'Health and readiness contracts for client/operator surfaces',
  endpoints: [GetMobileReadinessEndpoint],
};
