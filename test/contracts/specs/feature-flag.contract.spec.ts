/**
 * Feature Flag Contract Tests
 */

import {
  FeatureFlagDependencyUnavailableSchema,
  FeatureFlagCheckResponseSchema,
  FeatureFlagsResponseSchema,
} from '../schemas/feature-flag.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Feature Flag Contracts', () => {
  describe('GET /feature-flags/me', () => {
    it('should validate the flat mobile feature flag map', () => {
      const response = {
        deposit: true,
        send: true,
        receive: true,
        transactions: true,
        kyc: true,
        withdraw: false,
        off_ramp: false,
        virtual_cards: false,
        payment_links: true,
        referral_program: true,
        external_transfers: true,
        bill_payments: false,
        savings_pots: false,
        biometric_auth: true,
        mobile_money_withdrawals: false,
      };

      const result = validateSchema(response, FeatureFlagsResponseSchema);
      expect(result.valid).toBe(true);
      expect(response).not.toHaveProperty('flags');
    });

    it('should reject wrapped flag values because mobile expects flat booleans', () => {
      const response = {
        payment_links: { enabled: true },
      };

      const result = validateSchema(response, FeatureFlagsResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'payment_links' }),
      );
    });
  });

  describe('GET /feature-flags/check/:key', () => {
    it('should validate a single feature check response', () => {
      const response = {
        key: 'payment_links',
        enabled: true,
      };

      const result = validateSchema(response, FeatureFlagCheckResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Feature flag dependency failures', () => {
    it('should validate mobile-safe dependency unavailable envelopes', () => {
      const response = {
        success: false,
        error: {
          code: 'FEATURE_FLAG_DEPENDENCY_UNAVAILABLE',
          message:
            'Feature flags are temporarily unavailable. Cached app defaults may be used.',
          dependency: 'feature_flag_store',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/feature-flags/me',
          method: 'GET',
          timestamp: '2026-06-04T12:00:00.000Z',
        },
      };

      const result = validateSchema(
        response,
        FeatureFlagDependencyUnavailableSchema,
      );
      expect(result.valid).toBe(true);
    });
  });
});
