import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  required,
} from './types';

export const SecondaryFeatureCapabilitySchema: ContractSchema = {
  name: 'SecondaryFeatureCapability',
  description:
    'Mobile-safe availability metadata for secondary product surfaces.',
  fields: {
    feature: required(FieldType.STRING, { example: 'payment_links' }),
    available: required(FieldType.BOOLEAN, { example: true }),
    status: required(FieldType.STRING, {
      enum: ['available', 'unavailable'],
      example: 'available',
    }),
    reason: nullable(FieldType.STRING, {
      example: 'provider_or_feature_disabled',
    }),
    featureReason: nullable(FieldType.STRING, {
      example: 'payment_links_unavailable',
    }),
    provider: nullable(FieldType.STRING, { example: 'bill-pay' }),
    retryable: required(FieldType.BOOLEAN, { example: false }),
    supportReviewRequired: required(FieldType.BOOLEAN, { example: false }),
  },
};

function capabilityEndpoint(path: string, description: string): EndpointContract {
  return {
    method: 'GET',
    path,
    description,
    auth: 'bearer',
    responses: {
      200: SecondaryFeatureCapabilitySchema,
    },
  };
}

export const PaymentLinksCapabilityEndpoint = capabilityEndpoint(
  '/payment-links/capability',
  'Get payment link availability metadata',
);

export const SavingsPotsCapabilityEndpoint = capabilityEndpoint(
  '/savings-pots/capability',
  'Get savings pots availability metadata',
);

export const RecurringTransfersCapabilityEndpoint = capabilityEndpoint(
  '/recurring-transfers/capability',
  'Get recurring transfer availability metadata',
);

export const ReferralsCapabilityEndpoint = capabilityEndpoint(
  '/referrals/capability',
  'Get referral availability metadata',
);

export const SecondaryFeatureContractGroup: ContractGroup = {
  name: 'Secondary Feature Capabilities',
  basePath: '/',
  description:
    'Availability metadata endpoints used by mobile to avoid hardcoded assumptions for secondary product surfaces.',
  endpoints: [
    PaymentLinksCapabilityEndpoint,
    SavingsPotsCapabilityEndpoint,
    RecurringTransfersCapabilityEndpoint,
    ReferralsCapabilityEndpoint,
  ],
};
