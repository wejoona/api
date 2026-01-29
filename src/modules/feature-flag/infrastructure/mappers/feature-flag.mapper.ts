import { Injectable } from '@nestjs/common';
import { FeatureFlag } from '../../domain/entities/feature-flag.entity';
import { FeatureFlagOrmEntity } from '../orm-entities/feature-flag.orm-entity';

@Injectable()
export class FeatureFlagMapper {
  toDomain(entity: FeatureFlagOrmEntity): FeatureFlag {
    return FeatureFlag.reconstitute({
      id: entity.id,
      key: entity.key,
      name: entity.name,
      description: entity.description,
      isEnabled: entity.isEnabled,
      rolloutPercentage: entity.rolloutPercentage,
      enabledUserIds: entity.enabledUserIds,
      disabledUserIds: entity.disabledUserIds,
      enabledCountries: entity.enabledCountries,
      minAppVersion: entity.minAppVersion,
      platforms: entity.platforms,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(featureFlag: FeatureFlag): FeatureFlagOrmEntity {
    const entity = new FeatureFlagOrmEntity();
    entity.id = featureFlag.id;
    entity.key = featureFlag.key;
    entity.name = featureFlag.name;
    entity.description = featureFlag.description;
    entity.isEnabled = featureFlag.isEnabled;
    entity.rolloutPercentage = featureFlag.rolloutPercentage;
    entity.enabledUserIds = featureFlag.enabledUserIds;
    entity.disabledUserIds = featureFlag.disabledUserIds;
    entity.enabledCountries = featureFlag.enabledCountries;
    entity.minAppVersion = featureFlag.minAppVersion;
    entity.platforms = featureFlag.platforms;
    entity.startsAt = featureFlag.startsAt;
    entity.endsAt = featureFlag.endsAt;
    entity.metadata = featureFlag.metadata;
    return entity;
  }
}
