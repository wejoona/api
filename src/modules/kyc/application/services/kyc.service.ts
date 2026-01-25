import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KycVerificationRepository } from '../../infrastructure/repositories/kyc-verification.repository';
import {
  KycVerificationOrmEntity,
  KycVerificationStatus,
  IdDocumentType,
} from '../../infrastructure/orm-entities/kyc-verification.orm-entity';
import {
  IKycVerificationProvider,
  KYC_VERIFICATION_PROVIDER,
  VerificationResult,
} from '../../domain/interfaces/kyc-verification-provider.interface';
import { UploadService } from '../../../upload/application/services/upload.service';
import { ConfigService } from '@nestjs/config';

export interface SubmitKycDocumentsInput {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  idType: IdDocumentType;
  idNumber: string;
  idExpiryDate?: string;
  idFrontKey: string;
  idBackKey: string;
  selfieKey: string;
}

export interface KycStatusResponse {
  status: KycVerificationStatus;
  score?: number;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  canResubmit: boolean;
}

export interface AdminReviewInput {
  kycVerificationId: string;
  adminId: string;
  approved: boolean;
  notes?: string;
  rejectionReason?: string;
}

/**
 * KYC Service
 *
 * Orchestrates the KYC verification flow:
 * 1. User submits documents → auto-verification triggered
 * 2. If auto-verification passes (score >= 80) → approved
 * 3. If auto-verification needs review → manual_review
 * 4. Admin reviews and approves/rejects
 * 5. On approval → emits event to create wallet
 */
@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly autoApprovalEnabled: boolean;
  private readonly autoApprovalThreshold: number;

  constructor(
    private readonly repository: KycVerificationRepository,
    @Inject(KYC_VERIFICATION_PROVIDER)
    private readonly verificationProvider: IKycVerificationProvider,
    private readonly uploadService: UploadService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.autoApprovalEnabled = this.configService.get<boolean>('kyc.autoApprovalEnabled', true);
    this.autoApprovalThreshold = this.configService.get<number>('kyc.autoApprovalThreshold', 80);
  }

  /**
   * Create KYC verification record for new user
   * Called during user registration
   */
  async createForUser(userId: string): Promise<KycVerificationOrmEntity> {
    // Check if already exists
    const existing = await this.repository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    return this.repository.create(userId);
  }

  /**
   * Get KYC status for a user
   */
  async getStatus(userId: string): Promise<KycStatusResponse> {
    const kyc = await this.repository.findByUserId(userId);

    if (!kyc) {
      return {
        status: 'none',
        canResubmit: true,
      };
    }

    return {
      status: kyc.status,
      score: kyc.autoVerificationScore || undefined,
      submittedAt: kyc.submittedAt || undefined,
      approvedAt: kyc.approvedAt || undefined,
      rejectionReason: kyc.rejectionReason || undefined,
      canResubmit: kyc.status === 'rejected' || kyc.status === 'documents_pending',
    };
  }

  /**
   * Submit KYC documents for verification
   * Triggers auto-verification with third-party provider
   */
  async submitDocuments(input: SubmitKycDocumentsInput): Promise<KycVerificationOrmEntity> {
    const { userId } = input;

    // Get or create KYC record
    let kyc = await this.repository.findByUserId(userId);
    if (!kyc) {
      kyc = await this.repository.create(userId);
    }

    // Validate current status allows submission
    if (!['documents_pending', 'rejected'].includes(kyc.status)) {
      throw new BadRequestException(
        `Cannot submit documents when status is ${kyc.status}. Current status must be 'documents_pending' or 'rejected'.`,
      );
    }

    // Update KYC record with submitted data
    kyc.firstName = input.firstName;
    kyc.lastName = input.lastName;
    kyc.dateOfBirth = input.dateOfBirth;
    kyc.country = input.country;
    kyc.idType = input.idType;
    kyc.idNumber = input.idNumber;
    kyc.idExpiryDate = input.idExpiryDate || null;
    kyc.idFrontKey = input.idFrontKey;
    kyc.idBackKey = input.idBackKey;
    kyc.selfieKey = input.selfieKey;
    kyc.status = 'pending_verification';
    kyc.submittedAt = new Date();
    kyc.rejectionReason = null; // Clear any previous rejection

    await this.repository.save(kyc);

    // Trigger auto-verification
    try {
      await this.triggerAutoVerification(kyc);
    } catch (error) {
      this.logger.error(
        `Auto-verification failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // On auto-verification failure, route to manual review
      kyc.status = 'manual_review';
      await this.repository.save(kyc);
    }

    return kyc;
  }

  /**
   * Trigger auto-verification with third-party provider
   */
  private async triggerAutoVerification(kyc: KycVerificationOrmEntity): Promise<void> {
    this.logger.log(`Starting auto-verification for user ${kyc.userId}`);

    // Get signed URLs for documents (valid for 1 hour)
    const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
      this.uploadService.getSignedUrl(kyc.idFrontKey!, 3600),
      this.uploadService.getSignedUrl(kyc.idBackKey!, 3600),
      this.uploadService.getSignedUrl(kyc.selfieKey!, 3600),
    ]);

    // Call verification provider
    const result = await this.verificationProvider.verifyIdentity({
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      firstName: kyc.firstName!,
      lastName: kyc.lastName!,
      dateOfBirth: kyc.dateOfBirth!,
      idType: kyc.idType!,
      idNumber: kyc.idNumber!,
      country: kyc.country!,
      userId: kyc.userId,
      kycVerificationId: kyc.id,
    });

    // Store verification result
    kyc.autoVerificationProvider = this.verificationProvider.providerName;
    kyc.autoVerificationId = result.verificationId;
    kyc.autoVerificationScore = result.score;
    kyc.autoVerificationResult = result as unknown as Record<string, unknown>;
    kyc.autoVerifiedAt = result.verifiedAt;

    // Determine outcome based on score
    await this.processVerificationResult(kyc, result);
  }

  /**
   * Process verification result and update status
   */
  private async processVerificationResult(
    kyc: KycVerificationOrmEntity,
    result: VerificationResult,
  ): Promise<void> {
    const { score, status } = result;

    this.logger.log(
      `Verification result for user ${kyc.userId}: score=${score}, status=${status}`,
    );

    if (status === 'passed' && score >= this.autoApprovalThreshold && this.autoApprovalEnabled) {
      // Auto-approve
      kyc.status = 'auto_approved';
      await this.repository.save(kyc);

      // Finalize approval
      await this.finalizeApproval(kyc);
    } else if (status === 'failed' && score < 40) {
      // Auto-reject for very low scores
      kyc.status = 'rejected';
      kyc.rejectionReason = 'Identity verification failed. Please ensure your documents are clear and valid.';
      await this.repository.save(kyc);

      this.eventEmitter.emit('kyc.rejected', {
        userId: kyc.userId,
        kycVerificationId: kyc.id,
        reason: kyc.rejectionReason,
        score,
      });
    } else {
      // Route to manual review
      kyc.status = 'manual_review';
      await this.repository.save(kyc);

      this.eventEmitter.emit('kyc.manual_review_required', {
        userId: kyc.userId,
        kycVerificationId: kyc.id,
        score,
      });

      this.logger.log(`KYC for user ${kyc.userId} routed to manual review (score: ${score})`);
    }
  }

  /**
   * Admin reviews and approves/rejects KYC
   */
  async adminReview(input: AdminReviewInput): Promise<KycVerificationOrmEntity> {
    const kyc = await this.repository.findById(input.kycVerificationId);

    if (!kyc) {
      throw new NotFoundException('KYC verification not found');
    }

    if (kyc.status !== 'manual_review') {
      throw new BadRequestException(
        `Cannot review KYC when status is ${kyc.status}. Only 'manual_review' status can be reviewed.`,
      );
    }

    kyc.manualReviewedBy = input.adminId;
    kyc.manualReviewNotes = input.notes || null;
    kyc.manualReviewedAt = new Date();

    if (input.approved) {
      await this.repository.save(kyc);
      await this.finalizeApproval(kyc);
    } else {
      kyc.status = 'rejected';
      kyc.rejectionReason = input.rejectionReason || 'KYC verification rejected by reviewer.';
      await this.repository.save(kyc);

      this.eventEmitter.emit('kyc.rejected', {
        userId: kyc.userId,
        kycVerificationId: kyc.id,
        reason: kyc.rejectionReason,
        reviewedBy: input.adminId,
      });
    }

    return kyc;
  }

  /**
   * Finalize KYC approval - set status and emit event
   */
  private async finalizeApproval(kyc: KycVerificationOrmEntity): Promise<void> {
    kyc.status = 'approved';
    kyc.approvedAt = new Date();
    await this.repository.save(kyc);

    this.logger.log(`KYC approved for user ${kyc.userId}`);

    // Emit event to trigger wallet creation
    this.eventEmitter.emit('kyc.approved', {
      userId: kyc.userId,
      kycVerificationId: kyc.id,
      firstName: kyc.firstName,
      lastName: kyc.lastName,
      country: kyc.country,
    });
  }

  /**
   * Get all KYC pending manual review (for admin dashboard)
   */
  async getPendingReviews(): Promise<KycVerificationOrmEntity[]> {
    return this.repository.findPendingManualReview();
  }

  /**
   * Get KYC by ID (for admin)
   */
  async getById(id: string): Promise<KycVerificationOrmEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Get KYC statistics
   */
  async getStatistics(): Promise<Record<KycVerificationStatus, number>> {
    return this.repository.countByStatus();
  }
}
