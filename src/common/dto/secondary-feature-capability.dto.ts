export type SecondaryFeatureStatus = 'available' | 'unavailable';

export class SecondaryFeatureCapabilityDto {
  feature: string;
  available: boolean;
  status: SecondaryFeatureStatus;
  reason: string | null;
  featureReason: string | null;
  provider: string | null;
  retryable: boolean;
  supportReviewRequired: boolean;

  static available(
    feature: string,
    options: {
      provider?: string | null;
    } = {},
  ): SecondaryFeatureCapabilityDto {
    return {
      feature,
      available: true,
      status: 'available',
      reason: null,
      featureReason: null,
      provider: options.provider ?? null,
      retryable: false,
      supportReviewRequired: false,
    };
  }

  static unavailable(
    feature: string,
    options: {
      reason: string;
      featureReason: string;
      provider?: string | null;
      retryable?: boolean;
      supportReviewRequired?: boolean;
    },
  ): SecondaryFeatureCapabilityDto {
    return {
      feature,
      available: false,
      status: 'unavailable',
      reason: options.reason,
      featureReason: options.featureReason,
      provider: options.provider ?? null,
      retryable: options.retryable ?? false,
      supportReviewRequired: options.supportReviewRequired ?? false,
    };
  }
}
