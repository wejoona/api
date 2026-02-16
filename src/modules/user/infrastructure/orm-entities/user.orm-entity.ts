import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'users', schema: 'auth' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  phone: string;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  @Index()
  username: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'country_code', type: 'varchar', length: 3, default: 'CI' })
  countryCode: string;

  @Column({
    name: 'kyc_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  kycStatus: string;

  @Column({
    name: 'kyc_provider_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  kycProviderId: string | null;

  // Circle integration
  @Column({
    name: 'circle_user_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  @Index()
  circleUserId: string | null;

  @Column({ name: 'circle_user_token', type: 'text', nullable: true })
  circleUserToken: string | null;

  // Admin fields
  @Column({ type: 'varchar', length: 20, default: 'user' })
  @Index()
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt: Date | null;

  @Column({ name: 'suspended_reason', type: 'text', nullable: true })
  suspendedReason: string | null;

  // Avatar
  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'avatar_thumb', type: 'text', nullable: true })
  avatarThumb: string | null;

  @Column({ name: 'preferred_locale', type: 'varchar', length: 5, default: 'fr' })
  preferredLocale: string;

  // PIN fields
  @Column({ name: 'pin_hash', type: 'varchar', length: 255, nullable: true })
  pinHash: string | null;

  @Column({ name: 'pin_set_at', type: 'timestamp', nullable: true })
  pinSetAt: Date | null;

  @Column({ name: 'pin_attempts', type: 'integer', default: 0 })
  pinAttempts: number;

  @Column({ name: 'pin_locked_until', type: 'timestamp', nullable: true })
  pinLockedUntil: Date | null;

  // Email verification fields
  @Column({ name: 'email_verification_code', type: 'varchar', length: 6, nullable: true })
  emailVerificationCode: string | null;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ name: 'email_verification_expires_at', type: 'timestamp', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
