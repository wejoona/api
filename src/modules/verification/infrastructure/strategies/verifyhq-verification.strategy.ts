import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVerificationStrategy,
  CreateVerificationRequest,
  CreateVerificationResult,
  CheckVerificationRequest,
  CheckVerificationResult,
  VerificationCheckStatus,
} from '../../domain/strategies/verification-strategy.interface';

/**
 * VerifyHQ Verification Strategy
 *
 * Delegates OTP generation, delivery, and verification entirely to VerifyHQ.
 * We only store the verificationId returned by their API.
 *
 * VerifyHQ API:
 *   POST /v1/verifications       → create (sends OTP)
 *   POST /v1/verifications/check → verify code
 */
@Injectable()
export class VerifyHqVerificationStrategy implements IVerificationStrategy {
  readonly strategyName = 'verifyhq';

  private readonly logger = new Logger(VerifyHqVerificationStrategy.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('verification.verifyhq.baseUrl') ||
      'https://api.verifyhq.com';
    this.apiKey =
      this.configService.get<string>('verification.verifyhq.apiKey') || '';

    if (!this.apiKey) {
      this.logger.warn(
        'VerifyHQ API key not configured — strategy will fail at runtime',
      );
    }

    this.logger.log(
      `VerifyHqVerificationStrategy initialized (baseUrl=${this.baseUrl})`,
    );
  }

  async createVerification(
    request: CreateVerificationRequest,
  ): Promise<CreateVerificationResult> {
    const { phone, channel } = request;

    const response = await this.makeRequest('/v1/verifications', {
      to: phone,
      channel: channel || 'sms',
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `VerifyHQ createVerification failed: ${response.status} ${body}`,
      );

      if (response.status === 429) {
        throw new BadRequestException(
          'Too many verification requests. Please try again later.',
        );
      }
      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable',
      );
    }

    const data = await response.json();

    return {
      verificationId: data.id || data.verificationId || data.sid,
      expiresAt: data.expiresAt
        ? new Date(data.expiresAt)
        : new Date(Date.now() + 300_000), // default 5min
    };
  }

  async checkVerification(
    request: CheckVerificationRequest,
  ): Promise<CheckVerificationResult> {
    const { verificationId, code } = request;

    const response = await this.makeRequest('/v1/verifications/check', {
      verificationId,
      code,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `VerifyHQ checkVerification failed: ${response.status} ${body}`,
      );

      if (response.status === 429) {
        throw new BadRequestException(
          'Too many verification attempts. Please try again later.',
        );
      }

      // 404 = expired/not found
      if (response.status === 404) {
        return {
          status: 'expired' as VerificationCheckStatus,
          attemptsRemaining: 0,
        };
      }

      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable',
      );
    }

    const data = await response.json();

    // Map VerifyHQ status to our status
    const statusMap: Record<string, VerificationCheckStatus> = {
      approved: 'approved',
      verified: 'approved',
      pending: 'pending',
      expired: 'expired',
      failed: 'failed',
      canceled: 'failed',
    };

    const status: VerificationCheckStatus =
      statusMap[data.status] || 'pending';

    return {
      status,
      attemptsRemaining: data.attemptsRemaining ?? (status === 'approved' ? 0 : 2),
    };
  }

  private async makeRequest(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    try {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`VerifyHQ request to ${path} failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable',
      );
    }
  }
}
