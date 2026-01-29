import { FeatureFlag } from '../entities/feature-flag.entity';

export abstract class FeatureFlagRepository {
  abstract findById(id: string): Promise<FeatureFlag | null>;

  abstract findByKey(key: string): Promise<FeatureFlag | null>;

  abstract findAll(): Promise<FeatureFlag[]>;

  abstract findEnabled(): Promise<FeatureFlag[]>;

  abstract save(featureFlag: FeatureFlag): Promise<FeatureFlag>;

  abstract delete(key: string): Promise<void>;
}
