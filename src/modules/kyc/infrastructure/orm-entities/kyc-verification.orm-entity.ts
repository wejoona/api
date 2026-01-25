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
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';

/**
 * KYC Verification Status
 *
 * Flow:
 * 1. none → documents_pending (on registration)
 * 2. documents_pending → pending_verification (documents uploaded)
 * 3. pending_verification → auto_approved | manual_review | rejected
 * 4. manual_review → approved | rejected (admin decision)
 * 5. auto_approved → approved (automatic)
 */
export type KycVerificationStatus =
  | 'none'
  | 'documents_pending'
  | 'pending_verification'
  | 'auto_approved'
  | 'manual_review'
  | 'approved'
  | 'rejected';

export type IdDocumentType = 'passport' | 'national_id' | 'drivers_license';

@Entity('kyc_verifications')
export class KycVerificationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'documents_pending',
  })
  @Index()
  status: KycVerificationStatus;

  // ==========================================
  // Personal Information
  // ==========================================

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ name: 'date_of_birth', type: 'varchar', length: 10, nullable: true })
  dateOfBirth: string | null; // YYYY-MM-DD

  @Column({ name: 'country', type: 'varchar', length: 3, nullable: true })
  country: string | null; // ISO country code

  @Column({ name: 'id_type', type: 'varchar', length: 20, nullable: true })
  idType: IdDocumentType | null;

  @Column({ name: 'id_number', type: 'varchar', length: 50, nullable: true })
  idNumber: string | null;

  @Column({ name: 'id_expiry_date', type: 'varchar', length: 10, nullable: true })
  idExpiryDate: string | null;

  // ==========================================
  // Document S3 Keys
  // ==========================================

  @Column({ name: 'id_front_key', type: 'varchar', length: 255, nullable: true })
  idFrontKey: string | null;

  @Column({ name: 'id_back_key', type: 'varchar', length: 255, nullable: true })
  idBackKey: string | null;

  @Column({ name: 'selfie_key', type: 'varchar', length: 255, nullable: true })
  selfieKey: string | null;

  // ==========================================
  // Auto-Verification Results
  // ==========================================

  @Column({ name: 'auto_verification_provider', type: 'varchar', length: 50, nullable: true })
  autoVerificationProvider: string | null; // 'smile_identity', 'onfido', 'jumio'

  @Column({ name: 'auto_verification_id', type: 'varchar', length: 100, nullable: true })
  autoVerificationId: string | null;

  @Column({ name: 'auto_verification_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  autoVerificationScore: number | null; // 0-100 score

  @Column({ name: 'auto_verification_result', type: 'jsonb', nullable: true })
  autoVerificationResult: Record<string, unknown> | null;

  @Column({ name: 'auto_verified_at', type: 'timestamp', nullable: true })
  autoVerifiedAt: Date | null;

  // ==========================================
  // Manual Review
  // ==========================================

  @Column({ name: 'manual_reviewed_by', type: 'uuid', nullable: true })
  manualReviewedBy: string | null;

  @Column({ name: 'manual_review_notes', type: 'text', nullable: true })
  manualReviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'manual_reviewed_at', type: 'timestamp', nullable: true })
  manualReviewedAt: Date | null;

  // ==========================================
  // Timestamps
  // ==========================================

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ==========================================
  // Relations
  // ==========================================

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
