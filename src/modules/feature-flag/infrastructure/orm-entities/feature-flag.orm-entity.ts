import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'feature_flags', schema: 'system' })
export class FeatureFlagOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  key: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  @Index()
  isEnabled: boolean;

  @Column({ name: 'rollout_percentage', type: 'integer', default: 0 })
  rolloutPercentage: number;

  @Column({ name: 'enabled_user_ids', type: 'uuid', array: true, default: [] })
  enabledUserIds: string[];

  @Column({ name: 'disabled_user_ids', type: 'uuid', array: true, default: [] })
  disabledUserIds: string[];

  @Column({
    name: 'enabled_countries',
    type: 'varchar',
    length: 3,
    array: true,
    default: [],
  })
  enabledCountries: string[];

  @Column({
    name: 'min_app_version',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  minAppVersion: string | null;

  @Column({ type: 'varchar', length: 20, array: true, default: [] })
  platforms: string[];

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
