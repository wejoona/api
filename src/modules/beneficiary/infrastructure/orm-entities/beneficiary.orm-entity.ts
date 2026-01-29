import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

export enum BeneficiaryAccountType {
  JOONAPAY_USER = 'joonapay_user',
  EXTERNAL_WALLET = 'external_wallet',
  BANK_ACCOUNT = 'bank_account',
  MOBILE_MONEY = 'mobile_money',
}

@Entity({ name: 'beneficiaries', schema: 'wallet' })
@Unique('UQ_beneficiaries_wallet_phone', ['walletId', 'phoneE164'])
export class BeneficiaryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'phone_e164', type: 'varchar', length: 20, nullable: true })
  @Index()
  phoneE164: string | null;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: BeneficiaryAccountType,
    default: BeneficiaryAccountType.JOONAPAY_USER,
  })
  accountType: BeneficiaryAccountType;

  @Column({ name: 'beneficiary_user_id', type: 'uuid', nullable: true })
  @Index()
  beneficiaryUserId: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  beneficiaryUser?: UserOrmEntity;

  @Column({
    name: 'beneficiary_wallet_address',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  beneficiaryWalletAddress: string | null;

  @Column({ name: 'bank_code', type: 'varchar', length: 20, nullable: true })
  bankCode: string | null;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankAccountNumber: string | null;

  @Column({
    name: 'mobile_money_provider',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  mobileMoneyProvider: string | null;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'transfer_count', type: 'integer', default: 0 })
  transferCount: number;

  @Column({
    name: 'total_transferred',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
  })
  totalTransferred: string;

  @Column({ name: 'last_transfer_at', type: 'timestamp', nullable: true })
  lastTransferAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
