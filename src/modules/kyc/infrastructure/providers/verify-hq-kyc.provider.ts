import { Injectable, Logger } from '@nestjs/common';
import {
  IKycVerificationProvider,
  VerifyIdentityInput,
  VerificationResult,
  GetVerificationStatusInput,
} from '../../domain/interfaces/kyc-verification-provider.interface';
import { VerifyHqService } from '../../../shared/infrastructure/verify-hq';

/**
 * VerifyHQ KYC Provider
 *
 * Implements the KYC verification provider interface using VerifyHQ.
 * Bridges the Korido KYC system with the VerifyHQ identity verification service.
 *
 * Status mapping:
 * - VerifyHQ VERIFIED → KYC passed
 * - VerifyHQ REJECTED → KYC failed
 * - VerifyHQ MANUAL_REVIEW → KYC review
 * - VerifyHQ PENDING/IN_PROGRESS → KYC pending
 */
@Injectable()
export class VerifyHqKycProvider implements IKycVerificationProvider {
  private readonly logger = new Logger(VerifyHqKycProvider.name);

  readonly providerName = 'verify-hq';
  readonly autoApprovalThreshold = 80;

  constructor(private readonly verifyHqService: VerifyHqService) {}

  async verifyIdentity(input: VerifyIdentityInput): Promise<VerificationResult> {
    this.logger.log(`Verifying identity via VerifyHQ for user ${input.userId}`);

    try {
      // Start full identity verification via VerifyHQ
      const verification = await this.verifyHqService.startFullVerification(
        input.userId,
        'STANDARD',
      );

      // Map VerifyHQ status to Korido verification result
      return this.mapToVerificationResult(verification.id, (verification as any).overallStatus);
    } catch (error) {
      this.logger.error(
        `VerifyHQ verification failed for user ${input.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Return error result so the KYC service can route to manual review
      return {
        verificationId: `vhq_error_${input.kycVerificationId}_${Date.now()}`,
        score: 0,
        status: 'failed',
        checks: {
          documentAuthenticity: { passed: false, score: 0, details: 'Provider error' },
          documentExpiry: { passed: false },
          dataExtraction: { passed: false },
          faceMatch: { passed: false, score: 0 },
          livenessCheck: { passed: false, score: 0, isLive: false },
          dataMatch: { passed: false },
        },
        verifiedAt: new Date(),
      };
    }
  }

  async getVerificationStatus(
    input: GetVerificationStatusInput,
  ): Promise<VerificationResult> {
    const verification = await this.verifyHqService.getVerificationStatus(
      input.verificationId,
    );

    return this.mapToVerificationResult(
      verification.id,
      (verification as any).overallStatus,
      (verification as any).faceMatchScore,
    );
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    // TODO: Implement VerifyHQ webhook signature validation
    return true;
  }

  parseWebhookPayload(payload: Record<string, unknown>): VerificationResult {
    const status = payload.overallStatus as string;
    const id = payload.id as string;
    const faceMatchScore = payload.faceMatchScore as number | undefined;

    return this.mapToVerificationResult(id, status, faceMatchScore);
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private mapToVerificationResult(
    verificationId: string,
    overallStatus: string,
    faceMatchScore?: number,
  ): VerificationResult {
    const statusMap: Record<string, { status: VerificationResult['status']; score: number }> = {
      VERIFIED: { status: 'passed', score: 95 },
      REJECTED: { status: 'failed', score: 20 },
      MANUAL_REVIEW: { status: 'review', score: 65 },
      PENDING: { status: 'pending', score: 0 },
      IN_PROGRESS: { status: 'pending', score: 0 },
    };

    const mapped = statusMap[overallStatus] || { status: 'pending' as const, score: 0 };
    const faceScore = faceMatchScore ?? (mapped.status === 'passed' ? 95 : 50);

    return {
      verificationId,
      score: mapped.score,
      status: mapped.status,
      checks: {
        documentAuthenticity: {
          passed: mapped.status === 'passed',
          score: mapped.score,
          details: `VerifyHQ status: ${overallStatus}`,
        },
        documentExpiry: {
          passed: mapped.status !== 'failed',
        },
        dataExtraction: {
          passed: mapped.status !== 'failed',
        },
        faceMatch: {
          passed: faceScore >= 70,
          score: faceScore,
          details: `Face match score: ${faceScore}`,
        },
        livenessCheck: {
          passed: mapped.status === 'passed',
          score: mapped.score,
          isLive: mapped.status === 'passed',
        },
        dataMatch: {
          passed: mapped.status !== 'failed',
        },
      },
      verifiedAt: new Date(),
    };
  }
}
