import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { FeatureSubscription } from '../../domain/entities';

export class CreateFeatureSubscriptionDto {
  @IsString()
  @Length(2, 100)
  featureKey: string;

  @IsString()
  @Length(2, 100)
  source: string;

  @IsOptional()
  @IsIn(['subscribed', 'unsubscribed', 'notified'])
  status?: 'subscribed' | 'unsubscribed' | 'notified';

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class FeatureSubscriptionResponseDto {
  id: string;
  userId: string;
  featureKey: string;
  source: string;
  status: string;
  isActive: boolean;
  phone: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  static fromEntity(
    subscription: FeatureSubscription,
  ): FeatureSubscriptionResponseDto {
    return {
      id: subscription.id,
      userId: subscription.userId,
      featureKey: subscription.featureKey,
      source: subscription.source,
      status: subscription.status,
      isActive: subscription.isActive,
      phone: subscription.phone,
      email: subscription.email,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}

export class FeatureSubscriptionListResponseDto {
  items: FeatureSubscriptionResponseDto[];
  total: number;
  page: number;
  limit: number;

  static fromEntities(
    items: FeatureSubscription[],
    total: number,
    page: number,
    limit: number,
  ): FeatureSubscriptionListResponseDto {
    return {
      items: items.map(FeatureSubscriptionResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }
}
