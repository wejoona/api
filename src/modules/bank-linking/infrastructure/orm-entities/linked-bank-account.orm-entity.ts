import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BankAccountStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

export enum BankVerificationMethod {
  OTP = 'otp',
  MICRO_DEPOSIT = 'micro_deposit',
  INSTANT = 'instant',
}

@Entity({ name: 'linked_bank_accounts', schema: 'wallet' })
export class LinkedBankAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  @Index()
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({
    name: 'bank_logo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  bankLogoUrl: string | null;

  @Column({ name: 'account_number_encrypted', type: 'text' })
  accountNumberEncrypted: string;

  @Column({ name: 'account_number_masked', type: 'varchar', length: 20 })
  accountNumberMasked: string;

  @Column({ name: 'account_holder_name', type: 'varchar', length: 100 })
  accountHolderName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: BankAccountStatus.PENDING,
  })
  @Index()
  status: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  @Index()
  isPrimary: boolean;

  @Column({ name: 'country_code', type: 'varchar', length: 2, default: 'CI' })
  countryCode: string;

  @Column({ type: 'varchar', length: 3, default: 'XOF' })
  currency: string;

  @Column({
    name: 'available_balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  availableBalance: string | null;

  @Column({ name: 'last_balance_check_at', type: 'timestamp', nullable: true })
  lastBalanceCheckAt: Date | null;

  @Column({ name: 'last_verified_at', type: 'timestamp', nullable: true })
  lastVerifiedAt: Date | null;

  @Column({
    name: 'verification_method',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  verificationMethod: string | null;

  @Column({ name: 'supports_balance_check', type: 'boolean', default: false })
  supportsBalanceCheck: boolean;

  @Column({ name: 'supports_direct_debit', type: 'boolean', default: false })
  supportsDirectDebit: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
