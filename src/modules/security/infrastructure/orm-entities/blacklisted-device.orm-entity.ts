import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Blacklisted Device Entity
 * Stores device fingerprints and identifiers that are blocked from accessing the system
 */
@Entity('blacklisted_devices')
export class BlacklistedDeviceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Device fingerprint - unique identifier for the device
   * Can be a combination of: device ID, user agent hash, IP patterns
   */
  @Column({ name: 'device_fingerprint', type: 'varchar', length: 255 })
  @Index()
  deviceFingerprint: string;

  /**
   * Type of identifier being blacklisted
   * - device_id: Mobile device ID (ANDROID_ID, IDFV)
   * - fingerprint: Browser fingerprint hash
   * - ip_address: Specific IP address
   * - ip_range: IP range (CIDR notation)
   * - user_agent: User agent string hash
   */
  @Column({ name: 'identifier_type', type: 'varchar', length: 50 })
  @Index()
  identifierType:
    | 'device_id'
    | 'fingerprint'
    | 'ip_address'
    | 'ip_range'
    | 'user_agent';

  /**
   * Reason for blacklisting
   */
  @Column({ type: 'text' })
  reason: string;

  /**
   * Admin who added this device to blacklist
   */
  @Column({ name: 'blacklisted_by', type: 'uuid' })
  blacklistedBy: string;

  /**
   * Associated user ID (if this device was linked to a specific user)
   */
  @Column({ name: 'associated_user_id', type: 'uuid', nullable: true })
  @Index()
  associatedUserId: string | null;

  /**
   * Whether this blacklist entry is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  /**
   * Expiration date (null = permanent)
   */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  /**
   * Number of blocked attempts from this device
   */
  @Column({ name: 'blocked_attempts', type: 'integer', default: 0 })
  blockedAttempts: number;

  /**
   * Last blocked attempt timestamp
   */
  @Column({ name: 'last_blocked_at', type: 'timestamp', nullable: true })
  lastBlockedAt: Date | null;

  /**
   * Additional metadata (browser info, location, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
