import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'banks', schema: 'wallet' })
export class BankOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 2, default: 'CI' })
  @Index()
  country: string;

  @Column({
    name: 'verification_methods',
    type: 'jsonb',
    default: ['otp'],
  })
  verificationMethods: string[];

  @Column({ name: 'supports_balance_check', type: 'boolean', default: false })
  supportsBalanceCheck: boolean;

  @Column({ name: 'supports_direct_debit', type: 'boolean', default: false })
  supportsDirectDebit: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
