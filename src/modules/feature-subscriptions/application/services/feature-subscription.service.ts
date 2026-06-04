import { Injectable } from '@nestjs/common';
import { FeatureSubscription } from '../../domain/entities';
import { FeatureSubscriptionRepository } from '../../domain/repositories';
import {
  CreateFeatureSubscriptionDto,
  FEATURE_SUBSCRIPTION_CATALOG,
} from '../dto';

@Injectable()
export class FeatureSubscriptionService {
  constructor(private readonly repository: FeatureSubscriptionRepository) {}

  async subscribe(
    userId: string,
    dto: CreateFeatureSubscriptionDto,
  ): Promise<FeatureSubscription> {
    const metadata = this.buildMetadata(dto);
    const existing = await this.repository.findByUserFeatureAndSource(
      userId,
      dto.featureKey,
      dto.source,
    );

    if (existing) {
      existing.updateSubscription({
        status: dto.status ?? 'subscribed',
        phone: dto.phone,
        email: dto.email,
        metadata,
      });
      return this.repository.save(existing);
    }

    return this.repository.save(
      FeatureSubscription.create({
        userId,
        featureKey: dto.featureKey,
        source: dto.source,
        status: dto.status ?? 'subscribed',
        phone: dto.phone,
        email: dto.email,
        metadata,
      }),
    );
  }

  async listMine(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ items: FeatureSubscription[]; total: number }> {
    return this.repository.findByUserId(userId, options);
  }

  private buildMetadata(
    dto: CreateFeatureSubscriptionDto,
  ): Record<string, unknown> {
    const catalogEntry = FEATURE_SUBSCRIPTION_CATALOG[dto.featureKey];
    return this.pruneMetadata({
      ...(dto.metadata ?? {}),
      source: dto.source,
      featureName:
        dto.featureName ??
        this.readString(dto.metadata, 'featureName') ??
        catalogEntry?.featureName ??
        dto.featureKey,
      requestedFeature:
        dto.requestedFeature ??
        this.readString(dto.metadata, 'requestedFeature') ??
        catalogEntry?.requestedFeature ??
        dto.featureKey,
      countryCode:
        dto.countryCode ?? this.readString(dto.metadata, 'countryCode'),
      locale: dto.locale ?? this.readString(dto.metadata, 'locale'),
      platform: dto.platform ?? this.readString(dto.metadata, 'platform'),
      appVersion: dto.appVersion ?? this.readString(dto.metadata, 'appVersion'),
    });
  }

  private readString(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private pruneMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined),
    );
  }
}
