import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  RegulatoryReportType,
  ReportStatus,
  ReportPeriod,
  ExportFormat,
} from '../../domain/types';

/**
 * Regulatory Report ORM Entity
 *
 * Stores all regulatory reports with full audit trail.
 * Supports BCEAO transaction reports, SARs, compliance summaries, and audit exports.
 *
 * Retention: 7 years per BCEAO mandate.
 */
@Entity('regulatory_reports')
export class RegulatoryReportOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  @Index()
  reportType: RegulatoryReportType;

  @Column({ name: 'report_period', type: 'varchar', length: 20 })
  @Index()
  reportPeriod: ReportPeriod;

  @Column({ name: 'period_start', type: 'timestamp' })
  @Index()
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  @Index()
  periodEnd: Date;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'draft' })
  @Index()
  status: ReportStatus;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'report_data', type: 'jsonb' })
  reportData: Record<string, unknown>;

  @Column({
    name: 'export_format',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  exportFormat: ExportFormat | null;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ name: 'checksum', type: 'varchar', length: 128, nullable: true })
  checksum: string | null;

  @Column({
    name: 'bceao_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @Index()
  bceaoReference: string | null;

  @Column({ name: 'submission_deadline', type: 'timestamp', nullable: true })
  @Index()
  submissionDeadline: Date | null;

  @Column({ name: 'generated_by', type: 'varchar', length: 100 })
  generatedBy: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

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

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  @Index()
  archivedAt: Date | null;
}
