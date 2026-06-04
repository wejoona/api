import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  closeRedisClient,
  createConfiguredRedisClient,
} from '@/common/redis/redis-client.helper';
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
 *   POST /verifications             → create (sends OTP)
 *   POST /verifications/:id/check   → verify code
 */
@Injectable()
export class VerifyHqVerificationStrategy
  implements IVerificationStrategy, OnModuleDestroy
{
  readonly strategyName = 'verifyhq';

  private readonly logger = new Logger(VerifyHqVerificationStrategy.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly redis: Redis;
  private readonly mappingTtlSeconds: number;
  private isShuttingDown = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('verification.verifyhq.baseUrl') ||
      'https://api.verifyhq.com';
    this.apiKey =
      this.configService.get<string>('verification.verifyhq.apiKey') || '';
    this.mappingTtlSeconds =
      this.configService.get<number>('verification.local.expirySeconds') ||
      this.configService.get<number>('otp.expiresIn') ||
      300;

    this.redis = createConfiguredRedisClient(this.configService, this.logger, {
      maxRetriesPerRequest: 3,
      retryLogContext: 'VerifyHQ verification',
      isShuttingDown: () => this.isShuttingDown,
    });

    if (!this.apiKey) {
      this.logger.warn(
        'VerifyHQ API key not configured — strategy will fail at runtime',
      );
    }

    this.logger.log(
      `VerifyHqVerificationStrategy initialized (baseUrl=${this.baseUrl})`,
    );
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;

    await closeRedisClient(this.redis, this.logger, 'Redis VerifyHQ');
  }

  async createVerification(
    request: CreateVerificationRequest,
  ): Promise<CreateVerificationResult> {
    const { phone, channel } = request;

    const response = await this.makeRequest('/verifications', {
      phone,
      channel: channel || 'sms',
      purpose: request.purpose,
      codeLength:
        this.configService.get<number>('verification.local.otpLength') ||
        this.configService.get<number>('otp.length') ||
        6,
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
    const verificationId = data.verificationId || data.id || data.sid;

    if (!verificationId) {
      this.logger.error(
        `VerifyHQ createVerification returned no verification id: ${JSON.stringify(data)}`,
      );
      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable',
      );
    }

    await this.redis.setex(
      this.getPhoneMappingKey(phone),
      this.mappingTtlSeconds,
      verificationId,
    );

    return {
      verificationId,
      expiresAt: data.expiresAt
        ? new Date(data.expiresAt)
        : new Date(Date.now() + 300_000), // default 5min
    };
  }

  async checkVerification(
    request: CheckVerificationRequest,
  ): Promise<CheckVerificationResult> {
    const { code } = request;
    const phoneMappingKey = this.getPhoneMappingKey(request.verificationId);
    const mappedVerificationId = await this.redis.get(phoneMappingKey);

    if (!mappedVerificationId && request.verificationId.startsWith('+')) {
      return {
        status: 'expired' as VerificationCheckStatus,
        attemptsRemaining: 0,
      };
    }

    const verificationId = mappedVerificationId || request.verificationId;

    const response = await this.makeRequest(
      `/verifications/${verificationId}/check`,
      {
        code,
      },
    );

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
        if (mappedVerificationId) {
          await this.redis.del(phoneMappingKey);
        }
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

    const status: VerificationCheckStatus = statusMap[data.status] || 'pending';

    if (status === 'approved' && mappedVerificationId) {
      await this.redis.del(phoneMappingKey);
    }

    return {
      status,
      attemptsRemaining:
        data.attemptsRemaining ?? (status === 'approved' ? 0 : 2),
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
          'X-API-Key': this.apiKey,
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

  private getPhoneMappingKey(phone: string): string {
    return `verifyhq:verification:${phone}`;
  }
}
