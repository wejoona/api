import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FeatureSubscription,
  FeatureSubscriptionStatus,
} from '../../domain/entities';
import { FeatureSubscriptionRepository } from '../../domain/repositories';
import { FeatureSubscriptionOrmEntity } from '../orm-entities';

@Injectable()
export class TypeOrmFeatureSubscriptionRepository extends FeatureSubscriptionRepository {
  constructor(
    @InjectRepository(FeatureSubscriptionOrmEntity)
    private readonly repo: Repository<FeatureSubscriptionOrmEntity>,
  ) {
    super();
  }

  async findByUserFeatureAndSource(
    userId: string,
    featureKey: string,
    source: string,
  ): Promise<FeatureSubscription | null> {
    const entity = await this.repo.findOne({
      where: { userId, featureKey, source },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ items: FeatureSubscription[]; total: number }> {
    const page = Math.max(1, options.page);
    const limit = Math.min(Math.max(1, options.limit), 100);
    const [entities, total] = await this.repo.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: entities.map((entity) => this.toDomain(entity)), total };
  }

  async save(subscription: FeatureSubscription): Promise<FeatureSubscription> {
    const saved = await this.repo.save(this.toOrm(subscription));
    return this.toDomain(saved);
  }

  private toDomain(entity: FeatureSubscriptionOrmEntity): FeatureSubscription {
    return FeatureSubscription.create({
      id: entity.id,
      userId: entity.userId,
      featureKey: entity.featureKey,
      source: entity.source,
      status: entity.status as FeatureSubscriptionStatus,
      phone: entity.phone,
      email: entity.email,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrm(
    subscription: FeatureSubscription,
  ): FeatureSubscriptionOrmEntity {
    const entity = new FeatureSubscriptionOrmEntity();
    entity.id = subscription.id;
    entity.userId = subscription.userId;
    entity.featureKey = subscription.featureKey;
    entity.source = subscription.source;
    entity.status = subscription.status;
    entity.phone = subscription.phone;
    entity.email = subscription.email;
    entity.metadata = subscription.metadata;
    entity.createdAt = subscription.createdAt;
    entity.updatedAt = subscription.updatedAt;
    return entity;
  }
}
