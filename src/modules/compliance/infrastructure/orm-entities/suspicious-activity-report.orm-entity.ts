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
import {
  SARTriggerReason,
  SARStatus,
  RiskLevel,
} from '../../domain/compliance.types';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * Suspicious Activity Report (SAR) Entity
 *
 * Tracks suspicious transactions and patterns requiring investigation
 * and potential filing with BCEAO.
 *
 * BCEAO SAR Requirements:
 * - File within 48 hours of detection
 * - Include comprehensive transaction history
 * - Detailed narrative explanation
 * - Risk assessment and categorization
 * - 7-year retention period
 */
@Entity('suspicious_activity_reports')
export class SuspiciousActivityReportOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'transaction_ids', type: 'jsonb', default: '[]' })
  transactionIds: string[];

  @Column({ name: 'trigger_reason', type: 'varchar', length: 50 })
  @Index()
  triggerReason: SARTriggerReason;

  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2 })
  riskScore: number; // 0-100

  @Column({ name: 'risk_level', type: 'varchar', length: 20 })
  @Index()
  riskLevel: RiskLevel;

  @Column({ name: 'narrative', type: 'text' })
  narrative: string;

  @Column({ name: 'detection_method', type: 'varchar', length: 20 })
  detectionMethod: 'automated' | 'manual';

  @Column({ name: 'detected_at', type: 'timestamp' })
  @Index()
  detectedAt: Date;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'draft' })
  @Index()
  status: SARStatus;

  // User details snapshot (in case user is deleted/modified)
  @Column({ name: 'user_phone', type: 'varchar', length: 20 })
  userPhone: string;

  @Column({ name: 'user_first_name', type: 'varchar', length: 100, nullable: true })
  userFirstName: string | null;

  @Column({ name: 'user_last_name', type: 'varchar', length: 100, nullable: true })
  userLastName: string | null;

  @Column({ name: 'user_country_code', type: 'varchar', length: 3 })
  userCountryCode: string;

  @Column({ name: 'user_kyc_status', type: 'varchar', length: 20 })
  userKycStatus: string;

  @Column({ name: 'user_account_age_days', type: 'integer' })
  userAccountAgeDays: number;

  // Transaction summary
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
  })
  totalAmount: number;

  @Column({
    name: 'total_amount_xof',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalAmountXof: number;

  @Column({ name: 'transaction_count', type: 'integer', default: 0 })
  transactionCount: number;

  // Investigation details
  @Column({ name: 'investigated_by', type: 'uuid', nullable: true })
  investigatedBy: string | null;

  @Column({ name: 'investigation_notes', type: 'text', nullable: true })
  investigationNotes: string | null;

  @Column({ name: 'investigation_started_at', type: 'timestamp', nullable: true })
  investigationStartedAt: Date | null;

  // Submission details
  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  @Index()
  submittedAt: Date | null;

  @Column({ name: 'bceao_reference', type: 'varchar', length: 100, nullable: true })
  @Index()
  bceaoReference: string | null;

  // Closure details
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy: string | null;

  @Column({ name: 'closed_reason', type: 'text', nullable: true })
  closedReason: string | null;

  // Additional metadata
  @Column({ name: 'pattern_indicators', type: 'jsonb', nullable: true })
  patternIndicators: Record<string, unknown> | null;

  @Column({ name: 'related_sar_ids', type: 'jsonb', default: '[]' })
  relatedSarIds: string[]; // Related SAR reports

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete for 7-year retention compliance
  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  @Index()
  archivedAt: Date | null;

  // Relations
  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
