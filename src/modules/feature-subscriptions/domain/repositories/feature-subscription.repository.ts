import { FeatureSubscription } from '../entities';

export abstract class FeatureSubscriptionRepository {
  abstract findByUserFeatureAndSource(
    userId: string,
    featureKey: string,
    source: string,
  ): Promise<FeatureSubscription | null>;

  abstract findByUserId(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ items: FeatureSubscription[]; total: number }>;

  abstract save(
    subscription: FeatureSubscription,
  ): Promise<FeatureSubscription>;
}
