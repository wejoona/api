import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BillCategory, SupportedCountry } from '../../domain/types';

@Entity('bill_providers')
@Index(['country', 'category', 'isActive'])
export class BillProviderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  name: string;

  @Column({ name: 'short_name', type: 'varchar', length: 50 })
  shortName: string;

  @Column({ type: 'varchar', length: 30 })
  @Index()
  category: BillCategory;

  @Column({ type: 'varchar', length: 3 })
  @Index()
  country: SupportedCountry;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo: string | null;

  @Column({ name: 'requires_account_number', type: 'boolean', default: true })
  requiresAccountNumber: boolean;

  @Column({ name: 'requires_meter_number', type: 'boolean', default: false })
  requiresMeterNumber: boolean;

  @Column({ name: 'requires_customer_name', type: 'boolean', default: false })
  requiresCustomerName: boolean;

  @Column({
    name: 'account_number_label',
    type: 'varchar',
    length: 50,
    default: 'Account Number',
  })
  accountNumberLabel: string;

  @Column({
    name: 'account_number_pattern',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  accountNumberPattern: string | null;

  @Column({ name: 'account_number_length', type: 'int', nullable: true })
  accountNumberLength: number | null;

  @Column({ name: 'minimum_amount', type: 'decimal', precision: 18, scale: 2 })
  minimumAmount: number;

  @Column({ name: 'maximum_amount', type: 'decimal', precision: 18, scale: 2 })
  maximumAmount: number;

  @Column({
    name: 'processing_fee',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  processingFee: number;

  @Column({
    name: 'processing_fee_type',
    type: 'varchar',
    length: 20,
    default: 'fixed',
  })
  processingFeeType: 'fixed' | 'percentage';

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'supports_validation', type: 'boolean', default: true })
  supportsValidation: boolean;

  @Column({
    name: 'estimated_processing_time',
    type: 'varchar',
    length: 50,
    default: 'Instant',
  })
  estimatedProcessingTime: string;

  @Column({ name: 'operating_hours', type: 'jsonb', nullable: true })
  operatingHours: {
    start: string;
    end: string;
    timezone: string;
  } | null;

  @Column({ name: 'adapter_type', type: 'varchar', length: 50 })
  adapterType: string;

  @Column({ name: 'adapter_config', type: 'jsonb', nullable: true })
  adapterConfig: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
