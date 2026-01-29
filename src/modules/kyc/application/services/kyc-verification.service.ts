import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor, Snapshot } from 'xstate';
import {
  kycMachine,
  KycContext,
  KycState,
} from '../../domain/machines/kyc.machine';
import { KycProviderFactory } from '../../infrastructure/providers/kyc-provider.factory';
import { KycVerificationRepository } from '../../infrastructure/repositories/kyc-verification.repository';
import { UploadService } from '../../../upload';

export interface StartKycInput {
  userId: string;
}

export interface UploadDocumentsInput {
  userId: string;
  documentFrontKey: string;
  documentBackKey: string;
  selfieKey: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    idType: string;
    idNumber: string;
  };
}

export interface KycStatusOutput {
  userId: string;
  state: KycState;
  overallScore?: number;
  documentScore?: number;
  livenessScore?: number;
  identityScore?: number;
  rejectionReason?: string;
  canResubmit: boolean;
  attemptsRemaining: number;
}

// Map FSM states to ORM status values
const FSM_TO_ORM_STATUS: Record<string, string> = {
  none: 'none',
  documents_pending: 'documents_pending',
  documents_uploaded: 'documents_pending',
  pending_document_verification: 'pending_verification',
  pending_liveness_check: 'pending_verification',
  pending_identity_verification: 'pending_verification',
  auto_approved: 'auto_approved',
  manual_review: 'manual_review',
  approved: 'approved',
  rejected: 'rejected',
  complete: 'approved',
};

/**
 * KYC Verification Service
 *
 * Orchestrates the complete KYC verification flow using the FSM.
 * Integrates with multiple verification providers based on country.
 */
@Injectable()
export class KycVerificationService {
  private readonly logger = new Logger(KycVerificationService.name);
  private readonly actors = new Map<string, ReturnType<typeof createActor>>();

  constructor(
    private readonly kycRepository: KycVerificationRepository,
    private readonly providerFactory: KycProviderFactory,
    private readonly uploadService: UploadService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start KYC process for a user
   */
  async startKyc(input: StartKycInput): Promise<KycStatusOutput> {
    const { userId } = input;

    // Check if KYC already exists
    const existing = await this.kycRepository.findByUserId(userId);
    if (existing && !['rejected', 'none'].includes(existing.status)) {
      throw new BadRequestException('KYC already in progress or completed');
    }

    // Create actor with initial context
    const actor = createActor(kycMachine, {
      input: {
        entityId: userId,
        entityType: 'kyc',
        userId,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    actor.start();

    // Send REGISTER event to move to documents_pending
    actor.send({ type: 'REGISTER', userId });

    // Store actor reference
    this.actors.set(userId, actor);

    // Persist initial state
    const snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    this.logger.log(`Started KYC for user ${userId}`);

    return this.buildStatusOutput(userId, snapshot);
  }

  /**
   * Upload KYC documents and personal info
   */
  async uploadDocuments(input: UploadDocumentsInput): Promise<KycStatusOutput> {
    const {
      userId,
      documentFrontKey,
      documentBackKey,
      selfieKey,
      personalInfo,
    } = input;

    const actor = await this.getOrRestoreActor(userId);
    const currentState = this.getStateValue(actor.getSnapshot());

    if (!['documents_pending', 'documents_uploaded'].includes(currentState)) {
      throw new BadRequestException(
        `Cannot upload documents in state: ${currentState}`,
      );
    }

    // Send UPLOAD_DOCUMENTS event
    actor.send({
      type: 'UPLOAD_DOCUMENTS',
      documentFrontKey,
      documentBackKey,
      selfieKey,
      personalInfo,
    });

    const snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    this.logger.log(`Documents uploaded for user ${userId}`);

    return this.buildStatusOutput(userId, snapshot);
  }

  /**
   * Submit KYC for verification - triggers automated verification flow
   */
  async submitForVerification(userId: string): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    const currentState = this.getStateValue(actor.getSnapshot());

    if (currentState !== 'documents_uploaded') {
      throw new BadRequestException(
        `Cannot submit for verification in state: ${currentState}`,
      );
    }

    // Transition to pending_document_verification
    actor.send({ type: 'SUBMIT_FOR_VERIFICATION' });

    let snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    // Run verification pipeline
    const context = snapshot.context as KycContext;

    try {
      // Step 1: Document Verification
      const docResult = await this.runDocumentVerification(context);
      actor.send({
        type: 'DOCUMENT_VERIFICATION_COMPLETE',
        score: docResult.score,
        verificationId: docResult.verificationId,
        provider: docResult.provider,
      });

      snapshot = actor.getSnapshot();
      await this.persistState(userId, snapshot);

      // Check if rejected
      if (this.getStateValue(snapshot) === 'rejected') {
        return this.buildStatusOutput(userId, snapshot);
      }

      // Step 2: Liveness Check
      const livenessResult = await this.runLivenessCheck(context);
      actor.send({
        type: 'LIVENESS_CHECK_COMPLETE',
        score: livenessResult.score,
        verificationId: livenessResult.verificationId,
        provider: livenessResult.provider,
        isLive: livenessResult.isLive,
      });

      snapshot = actor.getSnapshot();
      await this.persistState(userId, snapshot);

      // Check if rejected
      if (this.getStateValue(snapshot) === 'rejected') {
        return this.buildStatusOutput(userId, snapshot);
      }

      // Step 3: Identity Verification
      const identityResult = await this.runIdentityVerification(context);
      actor.send({
        type: 'IDENTITY_VERIFICATION_COMPLETE',
        score: identityResult.score,
        verificationId: identityResult.verificationId,
        provider: identityResult.provider,
      });

      snapshot = actor.getSnapshot();
      await this.persistState(userId, snapshot);

      // Emit events based on final state
      const finalState = this.getStateValue(snapshot);
      if (finalState === 'approved') {
        this.eventEmitter.emit('kyc.approved', {
          userId,
          context: snapshot.context,
        });
      } else if (finalState === 'manual_review') {
        this.eventEmitter.emit('kyc.needs_review', {
          userId,
          context: snapshot.context,
        });
      } else if (finalState === 'rejected') {
        this.eventEmitter.emit('kyc.rejected', {
          userId,
          context: snapshot.context,
        });
      }

      return this.buildStatusOutput(userId, snapshot);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Verification failed';

      actor.send({
        type: 'VERIFICATION_FAILED',
        reason: errorMessage,
      });

      snapshot = actor.getSnapshot();
      await this.persistState(userId, snapshot);

      this.logger.error(
        `KYC verification failed for ${userId}: ${errorMessage}`,
      );

      return this.buildStatusOutput(userId, snapshot);
    }
  }

  /**
   * Admin approves manual review
   */
  async adminApprove(
    userId: string,
    adminId: string,
    notes?: string,
  ): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    const currentState = this.getStateValue(actor.getSnapshot());

    if (currentState !== 'manual_review') {
      throw new BadRequestException(
        `Cannot approve KYC in state: ${currentState}`,
      );
    }

    actor.send({
      type: 'ADMIN_APPROVE',
      adminId,
      notes,
    });

    const snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    this.eventEmitter.emit('kyc.approved', {
      userId,
      adminId,
      context: snapshot.context,
    });

    this.logger.log(`KYC approved by admin ${adminId} for user ${userId}`);

    return this.buildStatusOutput(userId, snapshot);
  }

  /**
   * Admin rejects manual review
   */
  async adminReject(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    const currentState = this.getStateValue(actor.getSnapshot());

    if (currentState !== 'manual_review') {
      throw new BadRequestException(
        `Cannot reject KYC in state: ${currentState}`,
      );
    }

    actor.send({
      type: 'ADMIN_REJECT',
      adminId,
      reason,
    });

    const snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    this.eventEmitter.emit('kyc.rejected', {
      userId,
      adminId,
      reason,
      context: snapshot.context,
    });

    this.logger.log(`KYC rejected by admin ${adminId} for user ${userId}`);

    return this.buildStatusOutput(userId, snapshot);
  }

  /**
   * User resubmits after rejection
   */
  async resubmit(userId: string): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    const snapshot = actor.getSnapshot();
    const context = snapshot.context as KycContext;
    const currentState = this.getStateValue(snapshot);

    if (currentState !== 'rejected') {
      throw new BadRequestException(
        `Cannot resubmit KYC in state: ${currentState}`,
      );
    }

    if (context.attempts >= context.maxAttempts) {
      throw new BadRequestException('Maximum KYC attempts reached');
    }

    actor.send({ type: 'RESUBMIT' });

    const newSnapshot = actor.getSnapshot();
    await this.persistState(userId, newSnapshot);

    this.logger.log(`KYC resubmission started for user ${userId}`);

    return this.buildStatusOutput(userId, newSnapshot);
  }

  /**
   * Mark wallet created after KYC approval
   */
  async markWalletCreated(userId: string): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    const currentState = this.getStateValue(actor.getSnapshot());

    if (currentState !== 'approved') {
      throw new BadRequestException(
        `Cannot mark wallet created in state: ${currentState}`,
      );
    }

    actor.send({ type: 'WALLET_CREATED' });

    const snapshot = actor.getSnapshot();
    await this.persistState(userId, snapshot);

    this.eventEmitter.emit('kyc.complete', {
      userId,
      context: snapshot.context,
    });

    this.logger.log(`KYC complete for user ${userId}`);

    return this.buildStatusOutput(userId, snapshot);
  }

  /**
   * Get current KYC status
   */
  async getStatus(userId: string): Promise<KycStatusOutput> {
    const actor = await this.getOrRestoreActor(userId);
    return this.buildStatusOutput(userId, actor.getSnapshot());
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private async runDocumentVerification(context: KycContext) {
    const provider = this.providerFactory.getDocumentVerificationProvider({
      country: context.country,
    });

    const documentUrl = await this.uploadService.getSignedUrl(
      context.documentFrontKey,
    );
    const documentBackUrl = await this.uploadService.getSignedUrl(
      context.documentBackKey,
    );

    const result = await provider.verifyDocument({
      requestId: `doc-${context.userId}-${Date.now()}`,
      userId: context.userId,
      documentType: (context.idType as any) || 'national_id',
      documentFrontUrl: documentUrl,
      documentBackUrl: documentBackUrl,
      issuingCountry: context.country || 'NG',
      expectedData: {
        firstName: context.firstName,
        lastName: context.lastName,
        dateOfBirth: context.dateOfBirth,
        documentNumber: context.idNumber,
      },
    });

    return {
      score: result.score,
      verificationId: result.verificationId,
      provider: provider.providerName,
    };
  }

  private async runLivenessCheck(context: KycContext) {
    const provider = this.providerFactory.getLivenessCheckProvider({
      country: context.country,
    });

    const selfieUrl = await this.uploadService.getSignedUrl(context.selfieKey);
    const documentUrl = await this.uploadService.getSignedUrl(
      context.documentFrontKey,
    );

    const result = await provider.checkLiveness({
      requestId: `live-${context.userId}-${Date.now()}`,
      userId: context.userId,
      checkType: 'passive',
      selfieUrl: selfieUrl,
      referenceImageUrl: documentUrl,
    });

    return {
      score: result.score,
      verificationId: result.verificationId,
      provider: provider.providerName,
      isLive: result.isLive,
    };
  }

  private async runIdentityVerification(context: KycContext) {
    const provider = this.providerFactory.getIdentityVerificationProvider({
      country: context.country,
    });

    const documentUrl = await this.uploadService.getSignedUrl(
      context.documentFrontKey,
    );
    const documentBackUrl = await this.uploadService.getSignedUrl(
      context.documentBackKey,
    );
    const selfieUrl = await this.uploadService.getSignedUrl(context.selfieKey);

    const result = await provider.verifyIdentity({
      requestId: `id-${context.userId}-${Date.now()}`,
      userId: context.userId,
      level: 'standard',
      personalInfo: {
        firstName: context.firstName,
        lastName: context.lastName,
        dateOfBirth: context.dateOfBirth,
        nationality: context.country,
      },
      document: {
        type: (context.idType as any) || 'national_id',
        number: context.idNumber,
        issuingCountry: context.country || 'NG',
        frontImageUrl: documentUrl,
        backImageUrl: documentBackUrl,
      },
      selfie: {
        imageUrl: selfieUrl,
      },
    });

    return {
      score: result.score,
      verificationId: result.verificationId,
      provider: provider.providerName,
    };
  }

  private async getOrRestoreActor(userId: string) {
    let actor = this.actors.get(userId);

    if (!actor) {
      // Restore from database
      const kyc = await this.kycRepository.findByUserId(userId);
      if (!kyc) {
        throw new BadRequestException('KYC not found for user');
      }

      // Map ORM status back to FSM state
      let fsmState: KycState = 'none';
      if (kyc.status === 'documents_pending') {
        fsmState = kyc.idFrontKey ? 'documents_uploaded' : 'documents_pending';
      } else if (kyc.status === 'pending_verification') {
        fsmState = 'pending_document_verification';
      } else {
        fsmState = kyc.status as KycState;
      }

      // Create actor with persisted state
      actor = createActor(kycMachine, {
        snapshot: {
          value: fsmState,
          context: {
            entityId: userId,
            entityType: 'kyc',
            userId,
            firstName: kyc.firstName,
            lastName: kyc.lastName,
            dateOfBirth: kyc.dateOfBirth,
            country: kyc.country,
            idType: kyc.idType,
            idNumber: kyc.idNumber,
            documentFrontKey: kyc.idFrontKey,
            documentBackKey: kyc.idBackKey,
            selfieKey: kyc.selfieKey,
            documentVerificationScore: kyc.autoVerificationScore,
            documentVerificationId: kyc.autoVerificationId,
            documentProvider: kyc.autoVerificationProvider,
            overallScore: kyc.autoVerificationScore,
            reviewedBy: kyc.manualReviewedBy,
            reviewNotes: kyc.manualReviewNotes,
            rejectionReason: kyc.rejectionReason,
            attempts: 0,
            maxAttempts: 3,
            createdAt: kyc.createdAt,
            updatedAt: kyc.updatedAt,
            submittedAt: kyc.submittedAt,
            verifiedAt: kyc.autoVerifiedAt,
            approvedAt: kyc.approvedAt,
          } as KycContext,
        } as unknown as Snapshot<unknown>,
      });

      actor.start();
      this.actors.set(userId, actor);
    }

    return actor;
  }

  private async persistState(
    userId: string,
    snapshot: Snapshot<unknown>,
  ): Promise<void> {
    const context = (snapshot as any).context as KycContext;
    const fsmState = this.getStateValue(snapshot);
    const ormStatus = FSM_TO_ORM_STATUS[fsmState] || 'documents_pending';

    await this.kycRepository.upsert({
      userId,
      status: ormStatus as any,
      firstName: context.firstName,
      lastName: context.lastName,
      dateOfBirth: context.dateOfBirth,
      country: context.country,
      idType: context.idType,
      idNumber: context.idNumber,
      idFrontKey: context.documentFrontKey,
      idBackKey: context.documentBackKey,
      selfieKey: context.selfieKey,
      autoVerificationProvider:
        context.documentProvider ||
        context.livenessProvider ||
        context.identityProvider,
      autoVerificationId:
        context.documentVerificationId ||
        context.livenessCheckId ||
        context.identityVerificationId,
      autoVerificationScore: context.overallScore,
      autoVerifiedAt: context.verifiedAt,
      manualReviewedBy: context.reviewedBy,
      manualReviewNotes: context.reviewNotes,
      rejectionReason: context.rejectionReason,
      submittedAt: context.submittedAt,
      approvedAt: context.approvedAt,
    });
  }

  private getStateValue(snapshot: Snapshot<unknown>): KycState {
    const value = (snapshot as any).value;
    return typeof value === 'string' ? (value as KycState) : 'none';
  }

  private buildStatusOutput(
    userId: string,
    snapshot: Snapshot<unknown>,
  ): KycStatusOutput {
    const context = (snapshot as any).context as KycContext;
    const state = this.getStateValue(snapshot);

    return {
      userId,
      state,
      overallScore: context.overallScore,
      documentScore: context.documentVerificationScore,
      livenessScore: context.livenessScore,
      identityScore: context.identityScore,
      rejectionReason: context.rejectionReason,
      canResubmit:
        state === 'rejected' && context.attempts < context.maxAttempts,
      attemptsRemaining: context.maxAttempts - context.attempts,
    };
  }
}
