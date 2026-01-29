import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { VerificationRepository } from '../../domain/repositories/verification.repository';
import {
  Verification,
  VerificationIdentifierType,
  VerificationStatus,
  VerificationType,
} from '../../domain/entities/verification.entity';

export interface CreateVerificationParams {
  userId?: string | null;
  identifier: string;
  identifierType?: VerificationIdentifierType;
  type: VerificationType;
  code: string;
  maxAttempts?: number;
  expiresInSeconds?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface VerifyCodeParams {
  identifier: string;
  type: VerificationType;
  code: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly verificationRepository: VerificationRepository,
  ) {}

  /**
   * Create a new verification record for audit trail.
   * The OTP code is hashed before storage for security.
   */
  async createVerification(
    params: CreateVerificationParams,
  ): Promise<Verification> {
    const {
      userId,
      identifier,
      identifierType = VerificationIdentifierType.PHONE,
      type,
      code,
      maxAttempts = 3,
      expiresInSeconds = 300,
      ipAddress,
      userAgent,
      deviceFingerprint,
      metadata,
    } = params;

    // Hash the code before storage
    const codeHash = this.hashCode(code);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const verification = Verification.create({
      userId,
      identifier,
      identifierType,
      type,
      codeHash,
      maxAttempts,
      expiresAt,
      ipAddress,
      userAgent,
      deviceFingerprint,
      metadata,
    });

    const saved = await this.verificationRepository.save(verification);
    this.logger.log(
      `Created verification ${saved.id} for ${identifier} type=${type}`,
    );

    return saved;
  }

  /**
   * Record a verification attempt in the database for audit.
   * Returns true if the code matches and verification is valid.
   * Note: Primary OTP validation should still use Redis for performance.
   */
  async recordVerificationAttempt(params: VerifyCodeParams): Promise<{
    success: boolean;
    verification: Verification | null;
    reason?: string;
  }> {
    const { identifier, type, code } = params;

    const verification =
      await this.verificationRepository.findPendingByIdentifier(
        identifier,
        type,
      );

    if (!verification) {
      return {
        success: false,
        verification: null,
        reason: 'no_pending_verification',
      };
    }

    // Check if expired
    if (verification.isExpired) {
      verification.markExpired();
      await this.verificationRepository.save(verification);
      return {
        success: false,
        verification,
        reason: 'expired',
      };
    }

    // Check if can attempt
    if (!verification.canAttempt) {
      return {
        success: false,
        verification,
        reason: 'max_attempts_exceeded',
      };
    }

    // Verify the code
    const codeHash = this.hashCode(code);
    const isValid = this.verifyHash(verification.codeHash, codeHash);

    if (isValid) {
      verification.markVerified();
      await this.verificationRepository.save(verification);
      this.logger.log(`Verification ${verification.id} verified successfully`);
      return {
        success: true,
        verification,
      };
    }

    // Invalid code - increment attempts
    verification.incrementAttempts();
    await this.verificationRepository.save(verification);

    this.logger.warn(
      `Verification ${verification.id} failed attempt ${verification.attempts}/${verification.maxAttempts}`,
    );

    return {
      success: false,
      verification,
      reason:
        verification.status === VerificationStatus.FAILED
          ? 'max_attempts_exceeded'
          : 'invalid_code',
    };
  }

  /**
   * Get verification history for a user (for audit purposes).
   */
  async getVerificationHistory(
    userId: string,
    limit: number = 50,
  ): Promise<Verification[]> {
    return this.verificationRepository.findByUserId(userId, limit);
  }

  /**
   * Mark pending verifications as expired (cleanup job).
   */
  async expireOldVerifications(): Promise<number> {
    const count = await this.verificationRepository.expireOldVerifications();
    if (count > 0) {
      this.logger.log(`Expired ${count} old verifications`);
    }
    return count;
  }

  /**
   * Delete old expired verifications (cleanup job).
   */
  async cleanupExpiredVerifications(olderThanDays: number = 30): Promise<number> {
    const count = await this.verificationRepository.deleteExpired(olderThanDays);
    if (count > 0) {
      this.logger.log(
        `Deleted ${count} expired verifications older than ${olderThanDays} days`,
      );
    }
    return count;
  }

  /**
   * Hash the OTP code for secure storage.
   * Uses SHA-256 for fast, one-way hashing.
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Constant-time comparison of hashes to prevent timing attacks.
   */
  private verifyHash(storedHash: string, providedHash: string): boolean {
    if (storedHash.length !== providedHash.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(storedHash),
      Buffer.from(providedHash),
    );
  }
}
