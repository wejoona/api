import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

/**
 * Sub-Account Entity
 *
 * PREPARED FOR FUTURE USE - Not active in v1
 *
 * Sub-accounts allow a single user to have multiple wallets
 * for different purposes (savings, business, family, etc.)
 *
 * Current limitation: One user = one account (main account only)
 * Future: Users can create sub-accounts, each with their own wallet
 */
export type SubAccountType = 'savings' | 'business' | 'family' | 'other';
export type SubAccountStatus = 'active' | 'suspended' | 'closed';

@Entity('sub_accounts')
export class SubAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parent_user_id', type: 'uuid' })
  @Index()
  parentUserId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  type: SubAccountType;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: SubAccountStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Each sub-account can have its own wallet
  @Column({ name: 'wallet_id', type: 'uuid', nullable: true, unique: true })
  walletId: string | null;

  // Spending limits for sub-accounts
  @Column({
    name: 'daily_limit',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  dailyLimit: number | null;

  @Column({
    name: 'monthly_limit',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  monthlyLimit: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'parent_user_id' })
  parentUser?: UserOrmEntity;
}
