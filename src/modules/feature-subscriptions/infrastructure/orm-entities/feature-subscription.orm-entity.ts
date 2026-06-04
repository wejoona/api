import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'feature_subscriptions', schema: 'system' })
@Unique('UQ_feature_subscriptions_user_feature_source', [
  'userId',
  'featureKey',
  'source',
])
export class FeatureSubscriptionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'feature_key', type: 'varchar', length: 100 })
  @Index()
  featureKey: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  source: string;

  @Column({ type: 'varchar', length: 30, default: 'subscribed' })
  status: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
