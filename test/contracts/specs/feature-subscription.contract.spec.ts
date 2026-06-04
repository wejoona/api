/**
 * Feature Subscription Contract Tests
 */

import {
  FeatureSubscriptionListResponseSchema,
  FeatureSubscriptionDependencyUnavailableSchema,
  FeatureSubscriptionRequestSchema,
  FeatureSubscriptionSchema,
} from '../schemas/feature-subscription.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Feature Subscription Contracts', () => {
  it('should validate a mobile feature subscription request with regional context', () => {
    const request = {
      featureKey: 'virtual_card',
      source: 'vcard_screen',
      status: 'subscribed',
      phone: '+2250748805663',
      email: 'ben@example.com',
      metadata: {
        countryCode: 'CI',
        locale: 'fr-CI',
        requestedFeature: 'virtual_card_launch',
      },
    };

    const result = validateSchema(request, FeatureSubscriptionRequestSchema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a mobile-compatible feature subscription response', () => {
    const subscription = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      featureKey: 'virtual_card',
      source: 'vcard_screen',
      status: 'subscribed',
      isActive: true,
      phone: '+2250748805663',
      email: null,
      metadata: {
        countryCode: 'CI',
        locale: 'fr-CI',
        requestedFeature: 'virtual_card_launch',
      },
      createdAt: '2026-06-04T10:00:00.000Z',
      updatedAt: '2026-06-04T10:00:00.000Z',
    };

    const result = validateSchema(subscription, FeatureSubscriptionSchema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate paginated current-user feature subscriptions', () => {
    const response = {
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          featureKey: 'bill_pay',
          source: 'services_screen',
          status: 'subscribed',
          isActive: true,
          phone: null,
          email: null,
          metadata: null,
          createdAt: '2026-06-04T10:00:00.000Z',
          updatedAt: '2026-06-04T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    const result = validateSchema(
      response,
      FeatureSubscriptionListResponseSchema,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate mobile-safe dependency unavailable error metadata', () => {
    const response = {
      success: false,
      error: {
        code: 'FEATURE_SUBSCRIPTION_DEPENDENCY_UNAVAILABLE',
        message:
          'Feature subscriptions are temporarily unavailable. Please try again later.',
        dependency: 'feature_subscription_store',
        retryable: true,
        supportReviewRequired: false,
      },
      meta: {
        path: '/api/v1/feature-subscriptions',
        method: 'POST',
      },
    };

    const result = validateSchema(
      response,
      FeatureSubscriptionDependencyUnavailableSchema,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
