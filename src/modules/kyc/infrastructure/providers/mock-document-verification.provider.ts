import { Injectable, Logger } from '@nestjs/common';
import {
  IDocumentVerificationProvider,
  DocumentType,
  VerifyDocumentInput,
  DocumentVerificationResult,
} from '../../domain/interfaces/document-verification-provider.interface';

/**
 * Mock Document Verification Provider
 *
 * For development and testing. Simulates document verification
 * based on document number patterns:
 *
 * - Contains "PASS" → High score (90+)
 * - Contains "FAIL" → Low score (<50)
 * - Contains "REVIEW" → Medium score (60-75)
 * - Contains "EXPIRED" → Expiry check fails
 * - Contains "FAKE" → Authenticity check fails
 * - Default → Random score 60-90
 */
@Injectable()
export class MockDocumentVerificationProvider implements IDocumentVerificationProvider {
  private readonly logger = new Logger(MockDocumentVerificationProvider.name);

  readonly providerName = 'mock_document';
  readonly supportedDocuments: DocumentType[] = [
    'passport',
    'national_id',
    'drivers_license',
    'residence_permit',
    'voter_id',
  ];
  readonly supportedCountries = ['*']; // All countries

  private verifications = new Map<string, DocumentVerificationResult>();

  async verifyDocument(input: VerifyDocumentInput): Promise<DocumentVerificationResult> {
    this.logger.log(`[MOCK] Verifying document for user ${input.userId}`);

    // Simulate processing delay
    await this.delay(800);

    const testScenario = this.detectTestScenario(input);
    const score = this.calculateScore(testScenario);
    const status = this.determineStatus(score, testScenario);

    const result: DocumentVerificationResult = {
      verificationId: `mock_doc_${input.requestId}_${Date.now()}`,
      status,
      score,
      extractedData: {
        firstName: input.expectedData?.firstName || 'John',
        lastName: input.expectedData?.lastName || 'Doe',
        dateOfBirth: input.expectedData?.dateOfBirth || '1990-01-01',
        documentNumber: input.expectedData?.documentNumber || 'ABC123456',
        expiryDate: testScenario.expired ? '2020-01-01' : '2030-01-01',
        issuingCountry: input.issuingCountry,
        nationality: input.issuingCountry,
      },
      checks: {
        authenticity: {
          name: 'authenticity',
          passed: !testScenario.fake,
          score: testScenario.fake ? 20 : Math.min(100, score + 5),
          details: testScenario.fake
            ? 'Document appears to be altered or forged'
            : 'Document appears authentic',
        },
        expiry: {
          name: 'expiry',
          passed: !testScenario.expired,
          details: testScenario.expired
            ? 'Document has expired'
            : 'Document is within validity period',
        },
        readability: {
          name: 'readability',
          passed: true,
          score: 95,
          details: 'All required fields are readable',
        },
        dataMatch: {
          name: 'dataMatch',
          passed: score >= 70,
          score: score,
          details:
            score >= 70
              ? 'Extracted data matches provided information'
              : 'Some data mismatches detected',
        },
        imageQuality: {
          name: 'imageQuality',
          passed: true,
          score: 90,
          details: 'Image quality is acceptable',
        },
      },
      mismatches:
        score < 70
          ? [
              {
                field: 'name',
                expected: input.expectedData?.firstName,
                found: 'Different Name',
              },
            ]
          : undefined,
      warnings: testScenario.warnings,
      provider: this.providerName,
      rawResponse: {
        mock: true,
        scenario: testScenario.name,
      },
      completedAt: new Date(),
    };

    this.verifications.set(result.verificationId, result);
    this.logger.log(
      `[MOCK] Document verification complete: ${result.verificationId} - ${status} (score: ${score})`,
    );

    return result;
  }

  async getVerificationStatus(verificationId: string): Promise<DocumentVerificationResult> {
    const result = this.verifications.get(verificationId);
    if (!result) {
      return {
        verificationId,
        status: 'error',
        score: 0,
        checks: {},
        errorMessage: 'Verification not found',
        provider: this.providerName,
        completedAt: new Date(),
      };
    }
    return result;
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    return true; // Mock always validates
  }

  parseWebhookPayload(payload: Record<string, unknown>): DocumentVerificationResult {
    const verificationId = payload.verificationId as string;
    return (
      this.verifications.get(verificationId) || {
        verificationId,
        status: 'error',
        score: 0,
        checks: {},
        errorMessage: 'Verification not found',
        provider: this.providerName,
        completedAt: new Date(),
      }
    );
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private detectTestScenario(input: VerifyDocumentInput): {
    name: string;
    pass: boolean;
    fail: boolean;
    review: boolean;
    expired: boolean;
    fake: boolean;
    warnings?: string[];
  } {
    const docNumber = (input.expectedData?.documentNumber || '').toUpperCase();
    const firstName = (input.expectedData?.firstName || '').toUpperCase();

    return {
      name: this.getScenarioName(docNumber, firstName),
      pass: docNumber.includes('PASS') || firstName.includes('PASS'),
      fail: docNumber.includes('FAIL') || firstName.includes('FAIL'),
      review: docNumber.includes('REVIEW') || firstName.includes('REVIEW'),
      expired: docNumber.includes('EXPIRED') || firstName.includes('EXPIRED'),
      fake: docNumber.includes('FAKE') || firstName.includes('FAKE'),
      warnings: docNumber.includes('WARN') ? ['Minor issue detected'] : undefined,
    };
  }

  private getScenarioName(docNumber: string, firstName: string): string {
    if (docNumber.includes('PASS') || firstName.includes('PASS')) return 'forced_pass';
    if (docNumber.includes('FAIL') || firstName.includes('FAIL')) return 'forced_fail';
    if (docNumber.includes('REVIEW') || firstName.includes('REVIEW')) return 'forced_review';
    if (docNumber.includes('EXPIRED') || firstName.includes('EXPIRED')) return 'expired_doc';
    if (docNumber.includes('FAKE') || firstName.includes('FAKE')) return 'fake_doc';
    return 'default';
  }

  private calculateScore(scenario: ReturnType<typeof this.detectTestScenario>): number {
    if (scenario.pass) return 90 + Math.floor(Math.random() * 10);
    if (scenario.fail || scenario.fake) return 20 + Math.floor(Math.random() * 25);
    if (scenario.review || scenario.expired) return 60 + Math.floor(Math.random() * 15);
    return 70 + Math.floor(Math.random() * 20); // Default: 70-90
  }

  private determineStatus(
    score: number,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): 'passed' | 'failed' | 'review' {
    if (scenario.fake || scenario.expired) return 'failed';
    if (score >= 80) return 'passed';
    if (score < 50) return 'failed';
    return 'review';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
