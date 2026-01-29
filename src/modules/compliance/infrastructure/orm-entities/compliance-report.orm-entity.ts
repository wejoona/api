import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ReportType, ReportStatus } from '../../domain/compliance.types';

/**
 * Compliance Report Entity
 *
 * Stores all BCEAO regulatory reports with 7-year retention per BCEAO mandate.
 * Supports daily, weekly, monthly, and suspicious activity reporting.
 *
 * BCEAO Retention Requirements:
 * - Transaction records: 7 years
 * - Customer identification: 7 years after account closure
 * - Correspondence: 7 years
 */
@Entity('compliance_reports')
export class ComplianceReportOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_type', type: 'varchar', length: 20 })
  @Index()
  reportType: ReportType;

  @Column({ name: 'period_start', type: 'timestamp' })
  @Index()
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  @Index()
  periodEnd: Date;

  @Column({ name: 'total_transactions', type: 'integer', default: 0 })
  totalTransactions: number;

  @Column({
    name: 'total_volume',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
  })
  totalVolume: number; // In USDC

  @Column({
    name: 'total_volume_xof',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalVolumeXof: number; // Converted to XOF for BCEAO

  @Column({ name: 'cross_border_count', type: 'integer', default: 0 })
  crossBorderCount: number;

  @Column({
    name: 'cross_border_volume',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
  })
  crossBorderVolume: number;

  @Column({ name: 'large_transaction_count', type: 'integer', default: 0 })
  largeTransactionCount: number; // Transactions >1M XOF

  @Column({ name: 'flagged_transactions', type: 'jsonb', default: '[]' })
  flaggedTransactions: string[]; // Array of transaction IDs

  @Column({ name: 'unique_users', type: 'integer', default: 0 })
  uniqueUsers: number;

  @Column({ name: 'new_users', type: 'integer', default: 0 })
  newUsers: number;

  @Column({ name: 'suspicious_activity_count', type: 'integer', default: 0 })
  suspiciousActivityCount: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  @Index()
  status: ReportStatus;

  @Column({ name: 'report_data', type: 'jsonb', nullable: true })
  reportData: Record<string, unknown> | null; // Full report payload

  @Column({
    name: 'bceao_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @Index()
  bceaoReference: string | null; // BCEAO submission reference number

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy: string | null; // User ID or 'system'

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  @Index()
  submittedAt: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete for 7-year retention compliance
  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  @Index()
  archivedAt: Date | null;
}
