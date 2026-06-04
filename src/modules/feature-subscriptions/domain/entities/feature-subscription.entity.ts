import { randomUUID } from 'crypto';

export type FeatureSubscriptionStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'notified';

export interface FeatureSubscriptionProps {
  id?: string;
  userId: string;
  featureKey: string;
  source: string;
  status?: FeatureSubscriptionStatus;
  phone?: string | null;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FeatureSubscription {
  readonly id: string;
  readonly userId: string;
  readonly featureKey: string;
  readonly source: string;
  status: FeatureSubscriptionStatus;
  phone: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: Required<FeatureSubscriptionProps>) {
    this.id = props.id;
    this.userId = props.userId;
    this.featureKey = props.featureKey;
    this.source = props.source;
    this.status = props.status;
    this.phone = props.phone;
    this.email = props.email;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: FeatureSubscriptionProps): FeatureSubscription {
    const now = new Date();
    return new FeatureSubscription({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      featureKey: props.featureKey,
      source: props.source,
      status: props.status ?? 'subscribed',
      phone: props.phone ?? null,
      email: props.email ?? null,
      metadata: props.metadata ?? null,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateSubscription(
    props: Pick<
      FeatureSubscriptionProps,
      'status' | 'phone' | 'email' | 'metadata'
    >,
  ): void {
    this.status = props.status ?? 'subscribed';
    this.phone = props.phone ?? this.phone;
    this.email = props.email ?? this.email;
    this.metadata = props.metadata ?? this.metadata;
    this.updatedAt = new Date();
  }

  get isActive(): boolean {
    return this.status === 'subscribed';
  }
}
