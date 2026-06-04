/**
 * Feature Subscription API Contracts
 *
 * Covers mobile "stay informed" and waitlist actions for unavailable or future
 * features. The contract keeps feature context explicit instead of storing a
 * generic newsletter flag.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  optional,
  required,
} from './types';

export const FeatureSubscriptionRequestSchema: ContractSchema = {
  name: 'FeatureSubscriptionRequest',
  description: 'Subscribe the current user to updates for a specific feature',
  fields: {
    featureKey: required(FieldType.STRING, {
      description: 'Stable feature identifier',
      example: 'virtual_card',
      minLength: 2,
      maxLength: 100,
    }),
    source: required(FieldType.STRING, {
      description: 'Mobile screen or flow where the user subscribed',
      example: 'vcard_screen',
      minLength: 2,
      maxLength: 100,
    }),
    status: optional(FieldType.STRING, {
      description: 'Subscription state; defaults to subscribed',
      enum: ['subscribed', 'unsubscribed', 'notified'],
      example: 'subscribed',
    }),
    phone: optional(FieldType.PHONE, {
      description: 'Optional contact phone in E.164 format',
      example: '+2250748805663',
    }),
    email: optional(FieldType.EMAIL, {
      description: 'Optional contact email',
      example: 'ben@example.com',
    }),
    metadata: optional(FieldType.OBJECT, {
      description: 'Support-safe product, locale, and region context',
      example: {
        countryCode: 'CI',
        locale: 'fr-CI',
        requestedFeature: 'virtual_card_launch',
      },
    }),
  },
};

export const FeatureSubscriptionSchema: ContractSchema = {
  name: 'FeatureSubscription',
  description: 'Current-user feature subscription visible to mobile',
  fields: {
    id: required(FieldType.UUID, {
      example: '550e8400-e29b-41d4-a716-446655440010',
    }),
    userId: required(FieldType.UUID, {
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    featureKey: required(FieldType.STRING, { example: 'virtual_card' }),
    source: required(FieldType.STRING, { example: 'vcard_screen' }),
    status: required(FieldType.STRING, {
      enum: ['subscribed', 'unsubscribed', 'notified'],
      example: 'subscribed',
    }),
    isActive: required(FieldType.BOOLEAN, { example: true }),
    phone: nullable(FieldType.PHONE, { example: '+2250748805663' }),
    email: nullable(FieldType.EMAIL, { example: 'ben@example.com' }),
    metadata: nullable(FieldType.OBJECT, {
      example: {
        countryCode: 'CI',
        locale: 'fr-CI',
        requestedFeature: 'virtual_card_launch',
      },
    }),
    createdAt: required(FieldType.DATE, {
      example: '2026-06-04T10:00:00.000Z',
    }),
    updatedAt: required(FieldType.DATE, {
      example: '2026-06-04T10:00:00.000Z',
    }),
  },
};

export const FeatureSubscriptionListResponseSchema: ContractSchema = {
  name: 'FeatureSubscriptionListResponse',
  description: 'Paginated current-user feature subscription list',
  fields: {
    items: required(FieldType.ARRAY, {
      itemType: FeatureSubscriptionSchema,
    }),
    total: required(FieldType.NUMBER, { example: 1 }),
    page: required(FieldType.NUMBER, { example: 1 }),
    limit: required(FieldType.NUMBER, { example: 20 }),
  },
};

export const FeatureSubscriptionEndpoints: EndpointContract[] = [
  {
    method: 'POST',
    path: '/feature-subscriptions',
    description: 'Subscribe current user to updates for one feature',
    auth: 'bearer',
    requestBody: FeatureSubscriptionRequestSchema,
    responses: { 200: FeatureSubscriptionSchema },
  },
  {
    method: 'GET',
    path: '/feature-subscriptions',
    description: 'List current-user feature subscriptions',
    auth: 'bearer',
    responses: { 200: FeatureSubscriptionListResponseSchema },
  },
];

export const FeatureSubscriptionContractGroup: ContractGroup = {
  name: 'Feature Subscriptions',
  basePath: '/',
  description: 'Mobile waitlist and stay-informed endpoints',
  endpoints: FeatureSubscriptionEndpoints,
};
