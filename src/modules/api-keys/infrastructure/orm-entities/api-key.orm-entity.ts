import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'api_keys', schema: 'system' })
export class ApiKeyOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255, unique: true })
  @Index('IDX_api_keys_key_hash')
  keyHash: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 8 })
  @Index('IDX_api_keys_key_prefix')
  keyPrefix: string;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ name: 'rate_limit', type: 'int', default: 60 })
  rateLimit: number;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index('IDX_api_keys_user_id')
  userId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  @Column({
    name: 'ip_whitelist',
    type: 'varchar',
    array: true,
    nullable: true,
  })
  ipWhitelist: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
