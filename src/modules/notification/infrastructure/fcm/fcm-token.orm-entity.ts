import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type FcmPlatform = 'ios' | 'android' | 'web';

/**
 * FCM Token Entity
 *
 * Stores Firebase Cloud Messaging tokens for push notifications.
 * Each user can have multiple tokens (one per device).
 *
 * Token lifecycle:
 * - Token is registered on app launch/login
 * - Token is updated when Firebase refreshes it
 * - Token is deactivated on logout or uninstall
 * - Invalid tokens are deactivated when FCM returns errors
 */
@Entity('fcm_tokens')
@Index(['userId', 'isActive']) // Composite index for active tokens lookup
@Index(['token'], { unique: true }) // Each token is unique
export class FcmTokenOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  token: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @Column({
    type: 'enum',
    enum: ['ios', 'android', 'web'],
    default: 'android',
  })
  platform: FcmPlatform;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'app_version', type: 'varchar', length: 50, nullable: true })
  appVersion: string | null;

  @Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
  osVersion: string | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  @Column({ name: 'last_failure_reason', type: 'text', nullable: true })
  lastFailureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
