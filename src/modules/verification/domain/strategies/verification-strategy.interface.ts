/**
 * Verification Strategy Interface
 *
 * Abstracts the OTP/verification mechanism so we can swap between:
 * - Local: generate OTP, hash, store in Redis, deliver via SMS gateway
 * - VerifyHQ: delegate entirely to VerifyHQ API
 */

export interface CreateVerificationRequest {
  /** Phone number in international format */
  phone: string;
  /** Delivery channel */
  channel: 'sms' | 'whatsapp' | 'voice';
  /** Purpose of verification (maps to VerificationType) */
  purpose: VerificationPurpose;
}

export interface CreateVerificationResult {
  /** Opaque ID to reference this verification attempt */
  verificationId: string;
  /** When the code expires */
  expiresAt: Date;
}

export interface CheckVerificationRequest {
  /** The verificationId returned from createVerification, or phone for legacy compat */
  verificationId: string;
  /** The code the user entered */
  code: string;
}

export type VerificationCheckStatus = 'approved' | 'pending' | 'expired' | 'failed';

export interface CheckVerificationResult {
  status: VerificationCheckStatus;
  attemptsRemaining: number;
}

export enum VerificationPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PIN_RESET = 'pin_reset',
  PHONE_CHANGE = 'phone_change',
  SENSITIVE_ACTION = 'sensitive_action',
}

export const VERIFICATION_STRATEGY = Symbol('VERIFICATION_STRATEGY');

export interface IVerificationStrategy {
  readonly strategyName: string;

  createVerification(
    request: CreateVerificationRequest,
  ): Promise<CreateVerificationResult>;

  checkVerification(
    request: CheckVerificationRequest,
  ): Promise<CheckVerificationResult>;
}
