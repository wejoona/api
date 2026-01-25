/**
 * Liveness Challenge and Session Types
 *
 * Defines types for challenge-based liveness detection.
 * This is a mock implementation that simulates real liveness checks
 * with random challenges that users must complete.
 */

export type ChallengeType = 'blink' | 'smile' | 'turn_head' | 'nod';

/**
 * A single liveness challenge for the user to complete
 */
export interface LivenessChallenge {
  /** Unique ID for this challenge */
  challengeId: string;

  /** Type of challenge (what action user must perform) */
  type: ChallengeType;

  /** Human-readable instruction for the user */
  instruction: string;

  /** When this challenge expires (becomes invalid) */
  expiresAt: Date;

  /** Order in the sequence (1, 2, 3, etc.) */
  order: number;
}

/**
 * Status of a liveness session
 */
export type LivenessSessionStatus =
  | 'pending'     // Session created, awaiting challenges
  | 'in_progress' // User is completing challenges
  | 'completed'   // All challenges completed successfully
  | 'failed'      // Liveness check failed (low confidence or fraud detected)
  | 'expired';    // Session timed out

/**
 * Result of a completed liveness session
 */
export interface LivenessResult {
  /** Unique session identifier */
  sessionId: string;

  /** User ID who performed the check */
  userId: string;

  /** Is the user verified as live (not a spoof)? */
  isLive: boolean;

  /** Overall confidence score (0-100) */
  confidence: number;

  /** Individual challenge results */
  challenges: {
    type: ChallengeType;
    passed: boolean;
    confidence: number;
    submittedAt: Date;
  }[];

  /** Final session status */
  status: LivenessSessionStatus;

  /** When the session was completed */
  completedAt: Date;

  /** Optional risk signals detected */
  riskSignals?: string[];

  /** Failure reason if applicable */
  failureReason?: string;
}

/**
 * Active liveness session
 */
export interface LivenessSession {
  /** Unique session identifier */
  sessionId: string;

  /** User ID who created this session */
  userId: string;

  /** All challenges for this session */
  challenges: LivenessChallenge[];

  /** Challenges that have been completed */
  completedChallenges: {
    challengeId: string;
    type: ChallengeType;
    passed: boolean;
    confidence: number;
    submittedAt: Date;
  }[];

  /** Current session status */
  status: LivenessSessionStatus;

  /** When session was created */
  createdAt: Date;

  /** When session expires */
  expiresAt: Date;

  /** Current challenge index */
  currentChallengeIndex: number;
}

/**
 * Response when starting a new liveness session
 */
export interface StartSessionResponse {
  /** Unique session identifier */
  sessionId: string;

  /** First challenge to complete */
  currentChallenge: LivenessChallenge;

  /** Total number of challenges in this session */
  totalChallenges: number;

  /** When the session expires */
  expiresAt: Date;
}

/**
 * Response after submitting a challenge
 */
export interface SubmitChallengeResponse {
  /** Session ID */
  sessionId: string;

  /** Did this challenge pass? */
  passed: boolean;

  /** Confidence score for this challenge (0-100) */
  confidence: number;

  /** Next challenge (if any remaining) */
  nextChallenge?: LivenessChallenge;

  /** Is the entire session complete? */
  sessionComplete: boolean;

  /** Number of challenges completed */
  completedCount: number;

  /** Total challenges in session */
  totalChallenges: number;
}
