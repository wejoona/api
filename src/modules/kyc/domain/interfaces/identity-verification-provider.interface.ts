/**
 * Identity Verification Provider Interface
 *
 * Provides abstraction for full identity verification services.
 * Combines document verification, liveness check, and face matching.
 * Also includes background checks and watchlist screening.
 *
 * Implementations: Onfido, Jumio, Veriff, Smile Identity, Trulioo, Mock
 */

export const IDENTITY_VERIFICATION_PROVIDER = Symbol(
  'IDENTITY_VERIFICATION_PROVIDER',
);

/**
 * Verification level/tier
 */
export type VerificationLevel =
  | 'basic' // Document + liveness only
  | 'standard' // + Face match
  | 'enhanced' // + Background checks
  | 'full'; // + Watchlist screening + Address verification

/**
 * Watchlist types for screening
 */
export type WatchlistType =
  | 'sanctions' // OFAC, EU, UN sanctions
  | 'pep' // Politically Exposed Persons
  | 'adverse_media' // Negative news
  | 'criminal' // Criminal records
  | 'terrorist'; // Terror watchlists

/**
 * Input for identity verification
 */
export interface VerifyIdentityInput {
  /** Unique ID for this verification request */
  requestId: string;

  /** User ID in our system */
  userId: string;

  /** Verification level to perform */
  level: VerificationLevel;

  /** Personal information */
  personalInfo: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string; // YYYY-MM-DD
    email?: string;
    phone?: string;
    nationality?: string;
  };

  /** Address information (for enhanced verification) */
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string; // ISO 3166-1 alpha-2
  };

  /** Document information */
  document: {
    type: 'passport' | 'national_id' | 'drivers_license';
    number?: string;
    issuingCountry: string;
    frontImageUrl: string;
    backImageUrl?: string;
    expiryDate?: string;
  };

  /** Selfie for liveness + face match */
  selfie: {
    imageUrl: string;
    videoUrl?: string; // For video liveness
  };

  /** Watchlist screening options */
  watchlistScreening?: {
    enabled: boolean;
    types: WatchlistType[];
    ongoingMonitoring?: boolean;
  };

  /** Device/session metadata */
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
  };

  /** Webhook URL for async results */
  webhookUrl?: string;
}

/**
 * Watchlist hit details
 */
export interface WatchlistHit {
  listType: WatchlistType;
  listName: string;
  matchScore: number;
  matchedName?: string;
  matchedDob?: string;
  details?: string;
  source?: string;
  lastUpdated?: Date;
}

/**
 * Face match result
 */
export interface FaceMatchResult {
  matched: boolean;
  similarity: number; // 0-100
  threshold: number;
  documentFaceQuality: number;
  selfieFaceQuality: number;
  details?: string;
}

/**
 * Background check result
 */
export interface BackgroundCheckResult {
  status: 'clear' | 'review' | 'fail';
  checks: {
    criminal?: { passed: boolean; details?: string };
    credit?: { passed: boolean; score?: number };
    employment?: { passed: boolean; details?: string };
    education?: { passed: boolean; details?: string };
  };
  rawResult?: Record<string, unknown>;
}

/**
 * Complete identity verification result
 */
export interface IdentityVerificationResult {
  /** Provider's verification ID */
  verificationId: string;

  /** Overall verification status */
  status: 'approved' | 'declined' | 'review' | 'pending' | 'error';

  /** Overall confidence score (0-100) */
  score: number;

  /** Verification level completed */
  level: VerificationLevel;

  /** Risk assessment */
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number; // 0-100 (higher = riskier)
    factors: string[];
  };

  /** Document verification sub-result */
  documentVerification?: {
    status: 'passed' | 'failed' | 'review';
    score: number;
    documentType: string;
    extractedData?: Record<string, unknown>;
    checks: Record<string, { passed: boolean; details?: string }>;
  };

  /** Liveness check sub-result */
  livenessCheck?: {
    status: 'passed' | 'failed' | 'review';
    score: number;
    isLive: boolean;
    spoofAttempt: boolean;
  };

  /** Face match sub-result */
  faceMatch?: FaceMatchResult;

  /** Watchlist screening sub-result */
  watchlistScreening?: {
    status: 'clear' | 'hit' | 'review';
    hits: WatchlistHit[];
    screenedLists: WatchlistType[];
  };

  /** Background check sub-result (if requested) */
  backgroundCheck?: BackgroundCheckResult;

  /** Address verification sub-result (if requested) */
  addressVerification?: {
    status: 'verified' | 'unverified' | 'partial';
    matchedFields: string[];
    unmatchedFields: string[];
  };

  /** Data consistency check */
  dataConsistency?: {
    status: 'consistent' | 'inconsistent';
    mismatches: Array<{
      field: string;
      documentValue?: string;
      providedValue?: string;
    }>;
  };

  /** Fraud signals detected */
  fraudSignals?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;

  /** Verified personal information (after extraction + validation) */
  verifiedInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality?: string;
    documentNumber?: string;
  };

  /** Reason for decline/review */
  reason?: string;

  /** Detailed rejection reasons */
  rejectionReasons?: string[];

  /** Provider name */
  provider: string;

  /** Raw response from provider */
  rawResponse?: Record<string, unknown>;

  /** Timestamps */
  submittedAt: Date;
  completedAt?: Date;

  /** Expiry date for verification (for re-verification requirements) */
  expiresAt?: Date;
}

/**
 * Identity Verification Provider Interface
 */
export interface IIdentityVerificationProvider {
  /**
   * Provider name for identification
   */
  readonly providerName: string;

  /**
   * Supported verification levels
   */
  readonly supportedLevels: VerificationLevel[];

  /**
   * Supported countries (ISO 3166-1 alpha-2)
   */
  readonly supportedCountries: string[];

  /**
   * Score thresholds
   */
  readonly thresholds: {
    autoApprove: number; // Score >= this = auto approve
    autoDecline: number; // Score < this = auto decline
    // Between these = manual review
  };

  /**
   * Verify identity (full verification flow)
   *
   * @param input - Identity verification input
   * @returns Verification result
   */
  verifyIdentity(
    input: VerifyIdentityInput,
  ): Promise<IdentityVerificationResult>;

  /**
   * Get status of a pending verification
   *
   * @param verificationId - Provider's verification ID
   * @returns Current verification result
   */
  getVerificationStatus(
    verificationId: string,
  ): Promise<IdentityVerificationResult>;

  /**
   * Screen against watchlists only
   *
   * @param input - Screening input
   * @returns Screening result
   */
  screenWatchlists?(input: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
    lists: WatchlistType[];
  }): Promise<{
    status: 'clear' | 'hit' | 'review';
    hits: WatchlistHit[];
  }>;

  /**
   * Generate SDK session token (for mobile SDK integrations)
   */
  generateSessionToken?(userId: string): Promise<{
    sessionToken: string;
    workflowId: string;
    expiresAt: Date;
  }>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload into verification result
   */
  parseWebhookPayload(
    payload: Record<string, unknown>,
  ): IdentityVerificationResult;
}
