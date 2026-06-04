import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { FeatureSubscription } from '../../domain/entities';

export const FEATURE_SUBSCRIPTION_CATALOG: Record<
  string,
  { featureName: string; requestedFeature: string }
> = {
  virtual_card: {
    featureName: 'Korido virtual card',
    requestedFeature: 'virtual_card_launch',
  },
  budget_controls: {
    featureName: 'Budget controls',
    requestedFeature: 'budget_controls_launch',
  },
  bill_payments: {
    featureName: 'Bill payments',
    requestedFeature: 'bill_payments_launch',
  },
  bank_linking: {
    featureName: 'Bank linking',
    requestedFeature: 'bank_linking_launch',
  },
};

export class CreateFeatureSubscriptionDto {
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9_:-]+$/)
  featureKey: string;

  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9_:-]+$/)
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
  @IsString()
  @Length(2, 100)
  featureName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  requestedFeature?: string;

  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Z]{2,3}$/)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 16)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  locale?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  @Matches(/^[a-z0-9_-]+$/)
  platform?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  appVersion?: string;

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
