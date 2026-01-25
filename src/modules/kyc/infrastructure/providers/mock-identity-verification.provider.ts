import { Injectable, Logger } from '@nestjs/common';
import {
  IIdentityVerificationProvider,
  VerificationLevel,
  VerifyIdentityInput,
  IdentityVerificationResult,
  WatchlistHit,
} from '../../domain/interfaces/identity-verification-provider.interface';

/**
 * Mock Identity Verification Provider
 *
 * For development and testing. Simulates full identity verification
 * based on name/ID patterns:
 *
 * - Contains "APPROVE" → Auto-approve (score 90+)
 * - Contains "DECLINE" → Auto-decline (score < 40)
 * - Contains "REVIEW" → Needs review (score 50-75)
 * - Contains "PEP" → Watchlist hit (PEP)
 * - Contains "SANCTION" → Watchlist hit (sanctions)
 * - Contains "MISMATCH" → Data mismatch detected
 * - Default → Score 70-90
 */
@Injectable()
export class MockIdentityVerificationProvider implements IIdentityVerificationProvider {
  private readonly logger = new Logger(MockIdentityVerificationProvider.name);

  readonly providerName = 'mock_identity';
  readonly supportedLevels: VerificationLevel[] = ['basic', 'standard', 'enhanced', 'full'];
  readonly supportedCountries = ['*'];
  readonly thresholds = {
    autoApprove: 80,
    autoDecline: 40,
  };

  private verifications = new Map<string, IdentityVerificationResult>();

  async verifyIdentity(input: VerifyIdentityInput): Promise<IdentityVerificationResult> {
    this.logger.log(`[MOCK] Verifying identity for user ${input.userId}`);

    // Simulate processing delay (longer for higher levels)
    const delayMs = input.level === 'full' ? 2000 : input.level === 'enhanced' ? 1500 : 1000;
    await this.delay(delayMs);

    const scenario = this.detectTestScenario(input);
    const scores = this.calculateScores(scenario);
    const status = this.determineStatus(scores.overall, scenario);

    const result: IdentityVerificationResult = {
      verificationId: `mock_id_${input.requestId}_${Date.now()}`,
      status,
      score: scores.overall,
      level: input.level,
      risk: {
        level: this.determineRiskLevel(scores.overall, scenario),
        score: 100 - scores.overall,
        factors: this.getRiskFactors(scenario),
      },
      documentVerification: {
        status: scores.document >= 70 ? 'passed' : scores.document >= 50 ? 'review' : 'failed',
        score: scores.document,
        documentType: input.document.type,
        extractedData: {
          firstName: input.personalInfo.firstName,
          lastName: input.personalInfo.lastName,
          dateOfBirth: input.personalInfo.dateOfBirth,
          documentNumber: input.document.number,
        },
        checks: {
          authenticity: { passed: scores.document >= 70, details: 'Document appears authentic' },
          expiry: { passed: true, details: 'Document within validity' },
          readability: { passed: true, details: 'All fields readable' },
        },
      },
      livenessCheck: {
        status: scores.liveness >= 80 ? 'passed' : scores.liveness >= 60 ? 'review' : 'failed',
        score: scores.liveness,
        isLive: scores.liveness >= 80,
        spoofAttempt: scenario.spoof,
      },
      faceMatch: {
        matched: scores.faceMatch >= 75,
        similarity: scores.faceMatch,
        threshold: 75,
        documentFaceQuality: 85,
        selfieFaceQuality: 90,
      },
      watchlistScreening:
        input.level === 'enhanced' || input.level === 'full'
          ? {
              status: scenario.watchlistHits.length > 0 ? 'hit' : 'clear',
              hits: scenario.watchlistHits,
              screenedLists: ['sanctions', 'pep', 'adverse_media'],
            }
          : undefined,
      dataConsistency: {
        status: scenario.mismatch ? 'inconsistent' : 'consistent',
        mismatches: scenario.mismatch
          ? [
              {
                field: 'name',
                documentValue: 'Different Name',
                providedValue: input.personalInfo.firstName,
              },
            ]
          : [],
      },
      fraudSignals: scenario.fraudSignals,
      verifiedInfo: status === 'approved' ? {
        firstName: input.personalInfo.firstName,
        lastName: input.personalInfo.lastName,
        dateOfBirth: input.personalInfo.dateOfBirth,
        nationality: input.personalInfo.nationality,
        documentNumber: input.document.number,
      } : undefined,
      reason: this.getStatusReason(status, scenario),
      rejectionReasons: status === 'declined' ? this.getRejectionReasons(scenario) : undefined,
      provider: this.providerName,
      rawResponse: {
        mock: true,
        scenario: scenario.name,
        scores,
      },
      submittedAt: new Date(),
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    this.verifications.set(result.verificationId, result);
    this.logger.log(
      `[MOCK] Identity verification complete: ${result.verificationId} - ${status} (score: ${scores.overall})`,
    );

    return result;
  }

  async getVerificationStatus(verificationId: string): Promise<IdentityVerificationResult> {
    const result = this.verifications.get(verificationId);
    if (!result) {
      return {
        verificationId,
        status: 'error',
        score: 0,
        level: 'basic',
        risk: { level: 'critical', score: 100, factors: ['verification_not_found'] },
        reason: 'Verification not found',
        provider: this.providerName,
        submittedAt: new Date(),
      };
    }
    return result;
  }

  async screenWatchlists(input: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
    lists: string[];
  }): Promise<{ status: 'clear' | 'hit' | 'review'; hits: WatchlistHit[] }> {
    const fullName = `${input.firstName} ${input.lastName}`.toUpperCase();

    if (fullName.includes('PEP')) {
      return {
        status: 'hit',
        hits: [
          {
            listType: 'pep',
            listName: 'Politically Exposed Persons',
            matchScore: 95,
            matchedName: input.firstName + ' ' + input.lastName,
          },
        ],
      };
    }

    if (fullName.includes('SANCTION')) {
      return {
        status: 'hit',
        hits: [
          {
            listType: 'sanctions',
            listName: 'OFAC SDN List',
            matchScore: 98,
            matchedName: input.firstName + ' ' + input.lastName,
          },
        ],
      };
    }

    return { status: 'clear', hits: [] };
  }

  async generateSessionToken(userId: string): Promise<{
    sessionToken: string;
    workflowId: string;
    expiresAt: Date;
  }> {
    return {
      sessionToken: `mock_session_${userId}_${Date.now()}`,
      workflowId: `mock_workflow_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    return true;
  }

  parseWebhookPayload(payload: Record<string, unknown>): IdentityVerificationResult {
    const verificationId = payload.verificationId as string;
    return (
      this.verifications.get(verificationId) || {
        verificationId,
        status: 'error',
        score: 0,
        level: 'basic',
        risk: { level: 'critical', score: 100, factors: [] },
        reason: 'Verification not found',
        provider: this.providerName,
        submittedAt: new Date(),
      }
    );
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private detectTestScenario(input: VerifyIdentityInput): {
    name: string;
    approve: boolean;
    decline: boolean;
    review: boolean;
    mismatch: boolean;
    spoof: boolean;
    watchlistHits: WatchlistHit[];
    fraudSignals: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>;
  } {
    const fullName = `${input.personalInfo.firstName} ${input.personalInfo.lastName}`.toUpperCase();
    const docNumber = (input.document.number || '').toUpperCase();

    const watchlistHits: WatchlistHit[] = [];
    if (fullName.includes('PEP')) {
      watchlistHits.push({
        listType: 'pep',
        listName: 'Politically Exposed Persons',
        matchScore: 95,
        matchedName: input.personalInfo.firstName + ' ' + input.personalInfo.lastName,
      });
    }
    if (fullName.includes('SANCTION')) {
      watchlistHits.push({
        listType: 'sanctions',
        listName: 'OFAC SDN List',
        matchScore: 98,
        matchedName: input.personalInfo.firstName + ' ' + input.personalInfo.lastName,
      });
    }

    const fraudSignals: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }> = [];
    if (fullName.includes('FRAUD') || docNumber.includes('FRAUD')) {
      fraudSignals.push({
        type: 'synthetic_identity',
        severity: 'high',
        description: 'Potential synthetic identity detected',
      });
    }

    return {
      name: this.getScenarioName(fullName, docNumber),
      approve: fullName.includes('APPROVE') || docNumber.includes('APPROVE'),
      decline: fullName.includes('DECLINE') || docNumber.includes('DECLINE') || fullName.includes('SANCTION'),
      review: fullName.includes('REVIEW') || docNumber.includes('REVIEW') || fullName.includes('PEP'),
      mismatch: fullName.includes('MISMATCH') || docNumber.includes('MISMATCH'),
      spoof: fullName.includes('SPOOF') || docNumber.includes('SPOOF'),
      watchlistHits,
      fraudSignals,
    };
  }

  private getScenarioName(fullName: string, docNumber: string): string {
    if (fullName.includes('APPROVE') || docNumber.includes('APPROVE')) return 'forced_approve';
    if (fullName.includes('DECLINE') || docNumber.includes('DECLINE')) return 'forced_decline';
    if (fullName.includes('SANCTION')) return 'sanctions_hit';
    if (fullName.includes('PEP')) return 'pep_hit';
    if (fullName.includes('REVIEW') || docNumber.includes('REVIEW')) return 'forced_review';
    if (fullName.includes('MISMATCH') || docNumber.includes('MISMATCH')) return 'data_mismatch';
    return 'default';
  }

  private calculateScores(scenario: ReturnType<typeof this.detectTestScenario>): {
    document: number;
    liveness: number;
    faceMatch: number;
    overall: number;
  } {
    if (scenario.approve) {
      return { document: 95, liveness: 95, faceMatch: 95, overall: 95 };
    }
    if (scenario.decline || scenario.spoof) {
      return { document: 30, liveness: 25, faceMatch: 20, overall: 25 };
    }
    if (scenario.review || scenario.watchlistHits.length > 0) {
      return { document: 75, liveness: 80, faceMatch: 70, overall: 65 };
    }
    if (scenario.mismatch) {
      return { document: 60, liveness: 85, faceMatch: 55, overall: 60 };
    }

    // Default: good scores
    const base = 75;
    return {
      document: base + Math.floor(Math.random() * 15),
      liveness: base + 5 + Math.floor(Math.random() * 15),
      faceMatch: base + Math.floor(Math.random() * 15),
      overall: base + Math.floor(Math.random() * 15),
    };
  }

  private determineStatus(
    score: number,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): 'approved' | 'declined' | 'review' | 'pending' | 'error' {
    if (scenario.decline || scenario.spoof || scenario.watchlistHits.some(h => h.listType === 'sanctions')) {
      return 'declined';
    }
    if (scenario.review || scenario.mismatch || scenario.watchlistHits.length > 0) {
      return 'review';
    }
    if (score >= this.thresholds.autoApprove) return 'approved';
    if (score < this.thresholds.autoDecline) return 'declined';
    return 'review';
  }

  private determineRiskLevel(
    score: number,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (scenario.watchlistHits.some(h => h.listType === 'sanctions')) return 'critical';
    if (scenario.fraudSignals.length > 0) return 'high';
    if (scenario.watchlistHits.length > 0) return 'high';
    if (score >= 85) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private getRiskFactors(scenario: ReturnType<typeof this.detectTestScenario>): string[] {
    const factors: string[] = [];
    if (scenario.watchlistHits.length > 0) factors.push('watchlist_match');
    if (scenario.mismatch) factors.push('data_inconsistency');
    if (scenario.spoof) factors.push('spoof_attempt');
    if (scenario.fraudSignals.length > 0) factors.push('fraud_indicators');
    return factors;
  }

  private getStatusReason(
    status: string,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): string | undefined {
    if (status === 'approved') return undefined;
    if (scenario.watchlistHits.some(h => h.listType === 'sanctions')) {
      return 'Matched against sanctions list';
    }
    if (scenario.spoof) return 'Liveness check failed - potential spoof attempt';
    if (scenario.mismatch) return 'Data inconsistency detected';
    if (scenario.watchlistHits.length > 0) return 'Requires additional review due to watchlist match';
    return 'Verification score below threshold';
  }

  private getRejectionReasons(scenario: ReturnType<typeof this.detectTestScenario>): string[] {
    const reasons: string[] = [];
    if (scenario.watchlistHits.some(h => h.listType === 'sanctions')) {
      reasons.push('Matched against international sanctions list');
    }
    if (scenario.spoof) reasons.push('Failed liveness verification');
    if (scenario.mismatch) reasons.push('Provided information does not match documents');
    if (scenario.decline) reasons.push('Verification score below acceptable threshold');
    return reasons.length > 0 ? reasons : ['Verification requirements not met'];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
