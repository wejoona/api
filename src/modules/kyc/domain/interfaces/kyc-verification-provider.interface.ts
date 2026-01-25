/**
 * KYC Verification Provider Interface
 *
 * Abstraction for third-party identity verification services.
 * Implementations:
 * - SmileIdentityKycProvider (Africa-focused)
 * - OnfidoKycProvider (Global)
 * - MockKycProvider (Development/Testing)
 *
 * Auto-verification flow:
 * 1. Submit documents + selfie for verification
 * 2. Provider performs ID verification + liveness check
 * 3. Returns score (0-100) and status
 * 4. If score >= threshold (80), auto-approve
 * 5. If score < threshold, route to manual review
 */

export interface VerifyIdentityInput {
  // Document URLs (signed S3 URLs)
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;

  // Personal information for matching
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  country: string; // ISO country code

  // Reference IDs
  userId: string;
  kycVerificationId: string;

  // Optional webhook for async results
  webhookUrl?: string;
}

export interface VerificationResult {
  // Provider's verification ID for tracking
  verificationId: string;

  // Overall confidence score (0-100)
  // >= 80: High confidence, can auto-approve
  // 50-79: Medium confidence, needs manual review
  // < 50: Low confidence, likely fraudulent
  score: number;

  // Verification status
  status: 'passed' | 'failed' | 'review' | 'pending';

  // Individual check results
  checks: {
    // ID document checks
    documentAuthenticity: {
      passed: boolean;
      score: number;
      details?: string;
    };
    documentExpiry: {
      passed: boolean;
      isExpired?: boolean;
      expiryDate?: string;
    };
    dataExtraction: {
      passed: boolean;
      extractedData?: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        idNumber?: string;
        expiryDate?: string;
      };
    };

    // Face matching
    faceMatch: {
      passed: boolean;
      score: number; // 0-100 similarity score
      details?: string;
    };

    // Liveness detection
    livenessCheck: {
      passed: boolean;
      score: number;
      isLive: boolean;
      details?: string;
    };

    // Data consistency
    dataMatch: {
      passed: boolean;
      mismatches?: string[];
    };
  };

  // Raw provider response for debugging
  rawResponse?: Record<string, unknown>;

  // Timestamp
  verifiedAt: Date;
}

export interface GetVerificationStatusInput {
  verificationId: string;
}

export interface IKycVerificationProvider {
  /**
   * Provider name for logging and tracking
   */
  readonly providerName: string;

  /**
   * Minimum score threshold for auto-approval
   * Default: 80
   */
  readonly autoApprovalThreshold: number;

  /**
   * Submit identity documents for verification
   * This may be synchronous or async depending on provider
   */
  verifyIdentity(input: VerifyIdentityInput): Promise<VerificationResult>;

  /**
   * Get status of a pending verification
   * Use when verification is async
   */
  getVerificationStatus(input: GetVerificationStatusInput): Promise<VerificationResult>;

  /**
   * Validate webhook payload signature
   * For async verification results
   */
  validateWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload into VerificationResult
   */
  parseWebhookPayload(payload: Record<string, unknown>): VerificationResult;
}

export const KYC_VERIFICATION_PROVIDER = Symbol('KYC_VERIFICATION_PROVIDER');

/**
 * Configuration for KYC verification
 */
export interface KycVerificationConfig {
  provider: 'smile_identity' | 'onfido' | 'mock';
  autoApprovalThreshold: number; // Default: 80
  autoApprovalEnabled: boolean; // Allow auto-approval or always manual
  webhookUrl?: string;
}
