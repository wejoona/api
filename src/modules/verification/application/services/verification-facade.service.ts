import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVerificationStrategy,
  VERIFICATION_STRATEGY,
  VerificationPurpose,
  CreateVerificationResult,
  CheckVerificationResult,
} from '../../domain/strategies/verification-strategy.interface';

/**
 * VerificationFacadeService
 *
 * Drop-in replacement for OtpService. Delegates to the configured
 * verification strategy (local or verifyhq). Provides the same
 * sendOtp / verifyOtp interface that usecases expect, plus the new
 * strategy-aware interface.
 */
@Injectable()
export class VerificationFacadeService {
  private readonly logger = new Logger(VerificationFacadeService.name);

  constructor(
    @Inject(VERIFICATION_STRATEGY)
    private readonly strategy: IVerificationStrategy,
    private readonly configService: ConfigService,
  ) {
    this.logger.log(
      `VerificationFacadeService using strategy: ${this.strategy.strategyName}`,
    );
  }

  // -------------------------------------------------------
  // New strategy-aware API
  // -------------------------------------------------------

  async createVerification(
    phone: string,
    purpose: VerificationPurpose,
    channel: 'sms' | 'whatsapp' | 'voice' = 'sms',
  ): Promise<CreateVerificationResult> {
    return this.strategy.createVerification({ phone, channel, purpose });
  }

  async checkVerification(
    verificationId: string,
    code: string,
  ): Promise<CheckVerificationResult> {
    return this.strategy.checkVerification({ verificationId, code });
  }

  // -------------------------------------------------------
  // Legacy OtpService-compatible API (for gradual migration)
  // -------------------------------------------------------

  /**
   * Send OTP — backward-compatible with OtpService.sendOtp(phone)
   */
  async sendOtp(phone: string): Promise<void> {
    await this.strategy.createVerification({
      phone,
      channel: 'sms',
      purpose: VerificationPurpose.LOGIN,
    });
  }

  /**
   * Verify OTP — backward-compatible with OtpService.verifyOtp(phone, otp)
   * For local strategy, verificationId = phone.
   * For verifyhq, callers should use checkVerification directly.
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const result = await this.strategy.checkVerification({
      verificationId: phone,
      code: otp,
    });
    return result.status === 'approved';
  }

  /**
   * Resend OTP — backward-compatible with OtpService.resendOtp(phone)
   */
  async resendOtp(phone: string): Promise<void> {
    await this.strategy.createVerification({
      phone,
      channel: 'sms',
      purpose: VerificationPurpose.LOGIN,
    });
  }

  /**
   * Get the underlying strategy name
   */
  get strategyName(): string {
    return this.strategy.strategyName;
  }
}
