import { Injectable, Logger } from '@nestjs/common';
import {
  IKycVerificationProvider,
  VerifyIdentityInput,
  VerificationResult,
  GetVerificationStatusInput,
} from '../../domain/interfaces/kyc-verification-provider.interface';

/**
 * Mock KYC Verification Provider
 *
 * For development and testing purposes.
 * Simulates different verification scenarios based on input.
 *
 * Test scenarios (based on last digit of ID number):
 * - 0-2: High score (85-100) → Auto-approve
 * - 3-5: Medium score (60-79) → Manual review
 * - 6-7: Low score (40-59) → Manual review with issues
 * - 8-9: Very low score (10-39) → Likely reject
 *
 * Special test cases (ID number contains):
 * - "PASS": Always passes with 95 score
 * - "FAIL": Always fails with 20 score
 * - "REVIEW": Always needs review with 70 score
 */
@Injectable()
export class MockKycProvider implements IKycVerificationProvider {
  private readonly logger = new Logger(MockKycProvider.name);

  readonly providerName = 'mock';
  readonly autoApprovalThreshold = 80;

  // Store mock verifications for status checks
  private verifications = new Map<string, VerificationResult>();

  async verifyIdentity(
    input: VerifyIdentityInput,
  ): Promise<VerificationResult> {
    this.logger.log(`[MOCK] Verifying identity for user ${input.userId}`);

    // Simulate processing delay
    await this.delay(500);

    // Determine score based on test scenarios
    const score = this.calculateMockScore(input.idNumber);
    const status = this.determineStatus(score);

    const result: VerificationResult = {
      verificationId: `mock_${input.kycVerificationId}_${Date.now()}`,
      score,
      status,
      checks: {
        documentAuthenticity: {
          passed: score >= 50,
          score: Math.min(100, score + 10),
          details:
            score >= 50
              ? 'Document appears authentic'
              : 'Document quality issues detected',
        },
        documentExpiry: {
          passed: true,
          isExpired: false,
          expiryDate: '2030-01-01',
        },
        dataExtraction: {
          passed: true,
          extractedData: {
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            idNumber: input.idNumber,
          },
        },
        faceMatch: {
          passed: score >= 60,
          score: Math.min(100, score + 5),
          details:
            score >= 60 ? 'Face matches ID photo' : 'Face match confidence low',
        },
        livenessCheck: {
          passed: score >= 50,
          score: Math.min(100, score + 8),
          isLive: score >= 50,
          details:
            score >= 50 ? 'Liveness confirmed' : 'Liveness check inconclusive',
        },
        dataMatch: {
          passed: score >= 70,
          mismatches:
            score < 70 ? ['Name spelling variation detected'] : undefined,
        },
      },
      rawResponse: {
        mock: true,
        testScenario: this.getTestScenario(input.idNumber),
      },
      verifiedAt: new Date(),
    };

    // Store for later retrieval
    this.verifications.set(result.verificationId, result);

    this.logger.log(
      `[MOCK] Verification complete: score=${score}, status=${status}, id=${result.verificationId}`,
    );

    return result;
  }

  async getVerificationStatus(
    input: GetVerificationStatusInput,
  ): Promise<VerificationResult> {
    const result = this.verifications.get(input.verificationId);

    if (!result) {
      // Return a default "not found" result
      return {
        verificationId: input.verificationId,
        score: 0,
        status: 'failed',
        checks: {
          documentAuthenticity: { passed: false, score: 0 },
          documentExpiry: { passed: false },
          dataExtraction: { passed: false },
          faceMatch: { passed: false, score: 0 },
          livenessCheck: { passed: false, score: 0, isLive: false },
          dataMatch: { passed: false },
        },
        verifiedAt: new Date(),
      };
    }

    return result;
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    // Mock always validates
    return true;
  }

  parseWebhookPayload(payload: Record<string, unknown>): VerificationResult {
    const verificationId = payload.verificationId as string;
    return (
      this.verifications.get(verificationId) || {
        verificationId,
        score: 0,
        status: 'failed' as const,
        checks: {
          documentAuthenticity: { passed: false, score: 0 },
          documentExpiry: { passed: false },
          dataExtraction: { passed: false },
          faceMatch: { passed: false, score: 0 },
          livenessCheck: { passed: false, score: 0, isLive: false },
          dataMatch: { passed: false },
        },
        verifiedAt: new Date(),
      }
    );
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private calculateMockScore(idNumber: string): number {
    // Special test cases
    const upperIdNumber = idNumber.toUpperCase();
    if (upperIdNumber.includes('PASS')) return 95;
    if (upperIdNumber.includes('FAIL')) return 20;
    if (upperIdNumber.includes('REVIEW')) return 70;

    // Score based on last digit
    const lastDigit = parseInt(idNumber.slice(-1), 10);
    if (isNaN(lastDigit)) return 75; // Default for non-numeric

    if (lastDigit <= 2) return 85 + Math.floor(Math.random() * 15); // 85-100
    if (lastDigit <= 5) return 60 + Math.floor(Math.random() * 20); // 60-79
    if (lastDigit <= 7) return 40 + Math.floor(Math.random() * 20); // 40-59
    return 10 + Math.floor(Math.random() * 30); // 10-39
  }

  private determineStatus(score: number): 'passed' | 'failed' | 'review' {
    if (score >= this.autoApprovalThreshold) return 'passed';
    if (score < 40) return 'failed';
    return 'review';
  }

  private getTestScenario(idNumber: string): string {
    const upperIdNumber = idNumber.toUpperCase();
    if (upperIdNumber.includes('PASS')) return 'forced_pass';
    if (upperIdNumber.includes('FAIL')) return 'forced_fail';
    if (upperIdNumber.includes('REVIEW')) return 'forced_review';

    const lastDigit = parseInt(idNumber.slice(-1), 10);
    if (isNaN(lastDigit)) return 'default';
    if (lastDigit <= 2) return 'high_confidence';
    if (lastDigit <= 5) return 'medium_confidence';
    if (lastDigit <= 7) return 'low_confidence';
    return 'very_low_confidence';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
