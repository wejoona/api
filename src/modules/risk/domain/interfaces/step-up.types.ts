/**
 * Step-Up Authentication Types
 * Risk-based adaptive authentication (like Visa 3DS / Apple)
 */

// Risk flow colors (like traffic lights)
export type RiskFlow = 'green' | 'yellow' | 'red';

// Step-up requirements
export type StepUpRequirement = 'none' | 'biometric' | 'otp' | 'liveness' | 'biometric_and_liveness' | 'manual_review';

export interface StepUpDecision {
  flow: RiskFlow;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  stepUpRequired: boolean;
  stepUpType: StepUpRequirement;
  reason?: string;
  factors: string[];
  expiresAt: Date;
  challengeToken?: string;
}

export interface StepUpValidation {
  challengeToken: string;
  stepUpType: StepUpRequirement;
  livenessSessionId?: string;
  biometricVerified?: boolean;
  otpVerified?: boolean;
}

export interface StepUpResult {
  valid: boolean;
  stepUpType: StepUpRequirement;
  completedAt: Date;
  expiresAt: Date;
}

// Step-up thresholds configuration
export interface StepUpConfig {
  // Risk score thresholds
  greenMaxScore: number;      // 0-30: No step-up
  yellowMaxScore: number;     // 31-60: Biometric
  redMinScore: number;        // 61+: Liveness

  // Amount-based overrides (always trigger regardless of score)
  highValueThreshold: number; // e.g., $1000 always requires liveness

  // Transaction type overrides
  alwaysRequireLiveness: string[]; // e.g., ['first_withdrawal', 'new_recipient']
  alwaysRequireBiometric: string[]; // e.g., ['external_transfer']
}

export const DEFAULT_STEP_UP_CONFIG: StepUpConfig = {
  greenMaxScore: 30,
  yellowMaxScore: 60,
  redMinScore: 61,
  highValueThreshold: 1000,
  alwaysRequireLiveness: ['first_external_withdrawal', 'account_recovery', 'kyc_selfie'],
  alwaysRequireBiometric: ['external_transfer', 'pin_change', 'add_recipient'],
};
