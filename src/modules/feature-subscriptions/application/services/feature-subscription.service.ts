import { Injectable } from '@nestjs/common';
import { FeatureSubscription } from '../../domain/entities';
import { FeatureSubscriptionRepository } from '../../domain/repositories';
import { CreateFeatureSubscriptionDto } from '../dto';

@Injectable()
export class FeatureSubscriptionService {
  constructor(private readonly repository: FeatureSubscriptionRepository) {}

  async subscribe(
    userId: string,
    dto: CreateFeatureSubscriptionDto,
  ): Promise<FeatureSubscription> {
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
        metadata: dto.metadata,
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
        metadata: dto.metadata,
      }),
    );
  }

  async listMine(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ items: FeatureSubscription[]; total: number }> {
    return this.repository.findByUserId(userId, options);
  }
}
