import { SecondaryFeatureCapabilitySchema } from '../schemas/secondary-feature.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Secondary Feature Capability Contracts', () => {
  it.each([
    'payment_links',
    'savings_pots',
    'recurring_transfers',
    'referrals',
  ])('should validate available metadata for %s', (feature) => {
    const response = {
      feature,
      available: true,
      status: 'available',
      reason: null,
      featureReason: null,
      provider: null,
      retryable: false,
      supportReviewRequired: false,
    };

    const result = validateSchema(response, SecondaryFeatureCapabilitySchema);
    expect(result.valid).toBe(true);
  });

  it('should validate unavailable provider metadata', () => {
    const response = {
      feature: 'cards',
      available: false,
      status: 'unavailable',
      reason: 'provider_or_feature_disabled',
      featureReason: 'card_issuing_unavailable',
      provider: null,
      retryable: false,
      supportReviewRequired: false,
    };

    const result = validateSchema(response, SecondaryFeatureCapabilitySchema);
    expect(result.valid).toBe(true);
  });

  it('should reject incomplete metadata because mobile needs retry/review hints', () => {
    const response = {
      feature: 'payment_links',
      available: true,
      status: 'available',
      reason: null,
      featureReason: null,
      provider: null,
    };

    const result = validateSchema(response, SecondaryFeatureCapabilitySchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'retryable' }),
        expect.objectContaining({ path: 'supportReviewRequired' }),
      ]),
    );
  });
});
