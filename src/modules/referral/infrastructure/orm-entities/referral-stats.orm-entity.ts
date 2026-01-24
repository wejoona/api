import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('referral_stats')
export class ReferralStatsOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({ name: 'referral_code', type: 'varchar', length: 20, unique: true })
  @Index()
  referralCode: string;

  @Column({ name: 'total_referrals', type: 'int', default: 0 })
  totalReferrals: number;

  @Column({ name: 'completed_referrals', type: 'int', default: 0 })
  completedReferrals: number;

  @Column({ name: 'pending_referrals', type: 'int', default: 0 })
  pendingReferrals: number;

  @Column({ name: 'total_earnings', type: 'bigint', default: 0 })
  totalEarnings: bigint;

  @Column({ name: 'pending_earnings', type: 'bigint', default: 0 })
  pendingEarnings: bigint;

  @Column({
    name: 'earnings_currency',
    type: 'varchar',
    length: 10,
    default: 'USDC',
  })
  earningsCurrency: string;

  @Column({ name: 'tier', type: 'varchar', length: 20, default: 'bronze' })
  tier: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
