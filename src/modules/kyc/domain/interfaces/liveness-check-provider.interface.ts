/**
 * Liveness Check Provider Interface
 *
 * Provides abstraction for liveness/anti-spoofing verification services.
 * Ensures the user is physically present and not using a photo/video/mask.
 *
 * Implementations: Onfido, Jumio, FaceTec, iProov, Smile Identity, Mock
 */

export const LIVENESS_CHECK_PROVIDER = Symbol('LIVENESS_CHECK_PROVIDER');

/**
 * Type of liveness check
 */
export type LivenessCheckType =
  | 'passive' // Single selfie analysis
  | 'active' // User performs actions (blink, smile, turn head)
  | 'video' // Short video recording
  | '3d_depth'; // 3D depth analysis (device dependent)

/**
 * Input for liveness check
 */
export interface LivenessCheckInput {
  /** Unique ID for this check request */
  requestId: string;

  /** User ID in our system */
  userId: string;

  /** Selfie image URL (signed URL or base64) */
  selfieUrl: string;

  /** Video URL for video-based checks */
  videoUrl?: string;

  /** Type of check to perform */
  checkType: LivenessCheckType;

  /** Reference image for face comparison (optional) */
  referenceImageUrl?: string;

  /** Device metadata for risk assessment */
  deviceInfo?: {
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };

  /** Webhook URL for async results */
  webhookUrl?: string;
}

/**
 * Liveness check result
 */
export interface LivenessCheckResult {
  /** Provider's verification ID */
  verificationId: string;

  /** Is the user live (not a spoof attempt)? */
  isLive: boolean;

  /** Overall status */
  status: 'passed' | 'failed' | 'review' | 'pending' | 'error';

  /** Liveness confidence score (0-100) */
  score: number;

  /** Individual check results */
  checks: {
    /** Overall liveness detection */
    liveness: {
      passed: boolean;
      score: number;
      details?: string;
    };

    /** Face detection quality */
    faceDetection?: {
      passed: boolean;
      faceCount: number;
      details?: string;
    };

    /** Image quality assessment */
    imageQuality?: {
      passed: boolean;
      score: number;
      issues?: string[]; // e.g., 'too_dark', 'blurry', 'face_too_small'
    };

    /** Active challenge results (if applicable) */
    challengeResponse?: {
      passed: boolean;
      challengeType: string;
      details?: string;
    };

    /** Spoof detection details */
    spoofDetection?: {
      passed: boolean;
      spoofType?: 'photo' | 'video' | 'mask' | 'deepfake' | 'none';
      confidence: number;
    };

    /** Device integrity check */
    deviceIntegrity?: {
      passed: boolean;
      issues?: string[]; // e.g., 'rooted', 'emulator', 'screen_recording'
    };
  };

  /** Face comparison with reference (if provided) */
  faceComparison?: {
    matched: boolean;
    similarity: number; // 0-100
    threshold: number;
  };

  /** Extracted face data */
  faceData?: {
    boundingBox?: { x: number; y: number; width: number; height: number };
    landmarks?: Record<string, { x: number; y: number }>;
    age?: { min: number; max: number };
    gender?: string;
  };

  /** Risk signals detected */
  riskSignals?: string[];

  /** Error message if status is 'error' */
  errorMessage?: string;

  /** Provider name */
  provider: string;

  /** Raw response from provider */
  rawResponse?: Record<string, unknown>;

  /** When check was completed */
  completedAt: Date;
}

/**
 * Liveness Check Provider Interface
 */
export interface ILivenessCheckProvider {
  /**
   * Provider name for identification
   */
  readonly providerName: string;

  /**
   * Supported check types
   */
  readonly supportedCheckTypes: LivenessCheckType[];

  /**
   * Minimum score threshold for passing
   */
  readonly passThreshold: number;

  /**
   * Perform liveness check
   *
   * @param input - Liveness check input
   * @returns Liveness check result
   */
  checkLiveness(input: LivenessCheckInput): Promise<LivenessCheckResult>;

  /**
   * Get status of a pending check
   *
   * @param verificationId - Provider's verification ID
   * @returns Current check result
   */
  getCheckStatus(verificationId: string): Promise<LivenessCheckResult>;

  /**
   * Generate SDK session token (for mobile SDK integrations)
   *
   * @param userId - User ID
   * @returns Session token for SDK initialization
   */
  generateSessionToken?(userId: string): Promise<{
    sessionToken: string;
    expiresAt: Date;
  }>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload into check result
   */
  parseWebhookPayload(payload: Record<string, unknown>): LivenessCheckResult;
}
