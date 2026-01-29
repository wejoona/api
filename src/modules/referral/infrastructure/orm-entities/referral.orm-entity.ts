import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReferralStatus = 'pending' | 'completed' | 'expired' | 'rewarded';

@Entity('referrals')
export class ReferralOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id', type: 'uuid' })
  @Index()
  referrerId: string;

  @Column({ name: 'referred_id', type: 'uuid', nullable: true })
  @Index()
  referredId: string | null;

  @Column({ name: 'referral_code', type: 'varchar', length: 20, unique: true })
  @Index()
  referralCode: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'expired', 'rewarded'],
    default: 'pending',
  })
  status: ReferralStatus;

  @Column({ name: 'referrer_reward', type: 'bigint', default: 0 })
  referrerReward: bigint;

  @Column({ name: 'referred_reward', type: 'bigint', default: 0 })
  referredReward: bigint;

  @Column({
    name: 'reward_currency',
    type: 'varchar',
    length: 10,
    default: 'USDC',
  })
  rewardCurrency: string;

  @Column({ name: 'rewarded_at', type: 'timestamp', nullable: true })
  rewardedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
