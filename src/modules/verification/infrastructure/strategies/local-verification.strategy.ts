import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import {
  IVerificationStrategy,
  CreateVerificationRequest,
  CreateVerificationResult,
  CheckVerificationRequest,
  CheckVerificationResult,
  VerificationCheckStatus,
} from '../../domain/strategies/verification-strategy.interface';
import {
  ISmsGateway,
  SMS_GATEWAY,
} from '../../../shared/domain/gateways/sms.gateway';

/**
 * Local Verification Strategy
 *
 * Generates OTP codes locally, stores hashed in Redis with expiry,
 * delivers via SMS gateway (Twilio, Africa's Talking, mock, etc.).
 * Verifies by comparing submitted code against Redis-stored hash.
 *
 * Includes: rate limiting, exponential backoff on failed attempts, lockout.
 */
@Injectable()
export class LocalVerificationStrategy
  implements IVerificationStrategy, OnModuleDestroy
{
  readonly strategyName = 'local';

  private readonly logger = new Logger(LocalVerificationStrategy.name);
  private readonly redis: Redis;
  private readonly otpExpiry: number;
  private readonly otpLength: number;
  private readonly maxAttempts: number;
  private readonly rateLimitWindow: number = 3600;
  private readonly maxOtpRequestsPerHour: number;
  private isRedisConnected = false;
  private isShuttingDown = false;
  private readonly disableRedisRetries = process.env.NODE_ENV === 'test';

  constructor(
    private readonly configService: ConfigService,
    @Inject(SMS_GATEWAY) private readonly smsGateway: ISmsGateway,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        if (this.isShuttingDown || this.disableRedisRetries) {
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.logger.log('Redis connected');
    });
    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      if (this.isShuttingDown) {
        return;
      }
      this.logger.error(`Redis error: ${error.message}`);
    });
    this.redis.on('close', () => {
      this.isRedisConnected = false;
    });

    this.otpExpiry =
      this.configService.get<number>('verification.local.expirySeconds') ||
      this.configService.get<number>('otp.expiresIn') ||
      300;
    this.otpLength =
      this.configService.get<number>('verification.local.otpLength') ||
      this.configService.get<number>('otp.length') ||
      6;
    this.maxAttempts = this.configService.get<number>('otp.maxAttempts') || 3;

    this.maxOtpRequestsPerHour =
      this.configService.get<number>('verification.local.maxRequestsPerHour') ||
      this.configService.get<number>('otp.maxRequestsPerHour') ||
      5;

    this.logger.log(
      `LocalVerificationStrategy initialized (otpLength=${this.otpLength}, expiry=${this.otpExpiry}s)`,
    );
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.isRedisConnected = false;

    if (this.redis && this.redis.status !== 'end') {
      this.redis.removeAllListeners?.();
      let timeoutId: NodeJS.Timeout;
      const shutdownTimeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Redis graceful shutdown timed out')),
          500,
        );
        timeoutId.unref();
      });

      try {
        await Promise.race([this.redis.quit(), shutdownTimeout]);
      } catch {
        this.redis.disconnect(false);
      } finally {
        clearTimeout(timeoutId!);
      }
    }
  }

  private ensureConnection(): void {
    if (!this.isRedisConnected) {
      throw new Error('Redis connection unavailable. Please try again later.');
    }
  }

  async createVerification(
    request: CreateVerificationRequest,
  ): Promise<CreateVerificationResult> {
    this.ensureConnection();

    const { phone } = request;

    // Rate limiting
    const rateLimitKey = `otp_rate:${phone}`;
    const requestCount = await this.redis.get(rateLimitKey);
    if (
      requestCount &&
      parseInt(requestCount, 10) >= this.maxOtpRequestsPerHour
    ) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }

    const otp = this.generateOtp();
    const key = this.getKey(phone);

    // Store OTP in Redis with expiry
    await this.redis.setex(key, this.otpExpiry, otp);
    // Reset attempts counter
    await this.redis.setex(`${key}:attempts`, this.otpExpiry, '0');

    // Increment rate limit counter
    const pipeline = this.redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, this.rateLimitWindow);
    await pipeline.exec();

    // Debug logging (dev only, double-checked)
    const enableOtpLogging = this.configService.get<boolean>(
      'otp.enableDebugLogging',
      false,
    );
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (enableOtpLogging && nodeEnv === 'development') {
      this.logger.debug(
        `[DEV ONLY] OTP for ${phone.slice(-4).padStart(phone.length, '*')}: ${otp}`,
      );
    }

    // Send via SMS gateway
    try {
      const result = await this.smsGateway.sendOtp(phone, otp);
      this.logger.log(
        `OTP sent to ${phone} via ${this.smsGateway.providerName}: ${result.id}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send OTP to ${phone}: ${errorMessage}`);
    }

    const expiresAt = new Date(Date.now() + this.otpExpiry * 1000);

    return {
      // For local strategy, verificationId is the phone number itself
      verificationId: phone,
      expiresAt,
    };
  }

  async checkVerification(
    request: CheckVerificationRequest,
  ): Promise<CheckVerificationResult> {
    this.ensureConnection();

    // verificationId is the phone number for local strategy
    const phone = request.verificationId;
    const key = this.getKey(phone);
    const attemptsKey = `${key}:attempts`;
    const lockoutKey = `${key}:lockout`;

    // Check lockout (exponential backoff)
    const lockoutUntil = await this.redis.get(lockoutKey);
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil, 10);
      const now = Date.now();
      if (now < lockoutTime) {
        const remainingSeconds = Math.ceil((lockoutTime - now) / 1000);
        throw new BadRequestException(
          `Too many failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
        );
      }
      await this.redis.del(lockoutKey);
    }

    // Check attempts
    const attempts = await this.redis.get(attemptsKey);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;
    if (attemptCount >= this.maxAttempts) {
      return {
        status: 'failed' as VerificationCheckStatus,
        attemptsRemaining: 0,
      };
    }

    const storedOtp = await this.redis.get(key);
    if (!storedOtp) {
      return {
        status: 'expired' as VerificationCheckStatus,
        attemptsRemaining: Math.max(0, this.maxAttempts - attemptCount),
      };
    }

    // Constant-time comparison
    const isValid =
      crypto.timingSafeEqual(
        Buffer.from(storedOtp),
        Buffer.from(request.code.padEnd(storedOtp.length)),
      ) && storedOtp.length === request.code.length;

    if (isValid) {
      // Cleanup
      await this.redis.del(key);
      await this.redis.del(attemptsKey);
      await this.redis.del(lockoutKey);
      return {
        status: 'approved' as VerificationCheckStatus,
        attemptsRemaining: Math.max(0, this.maxAttempts - attemptCount - 1),
      };
    }

    // Failed attempt — increment + backoff
    const newAttempts = await this.redis.incr(attemptsKey);
    if (newAttempts >= 1) {
      const backoffSeconds = Math.min(5 * Math.pow(3, newAttempts - 1), 300);
      const lockoutUntilMs = Date.now() + backoffSeconds * 1000;
      await this.redis.setex(
        lockoutKey,
        backoffSeconds + 60,
        lockoutUntilMs.toString(),
      );
    }

    const remaining = Math.max(0, this.maxAttempts - newAttempts);
    return {
      status: remaining <= 0 ? 'failed' : 'pending',
      attemptsRemaining: remaining,
    };
  }

  // ---- Dev helpers (preserved for DevController compat) ----

  async getOtp(phone: string): Promise<string | null> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv !== 'development') {
      throw new Error('getOtp is only available in development mode');
    }
    this.ensureConnection();
    return this.redis.get(this.getKey(phone));
  }

  async getOtpDebugInfo(phone: string): Promise<{
    otp: string | null;
    ttl: number;
    attempts: number;
    isLocked: boolean;
    lockoutRemaining: number | null;
  }> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv !== 'development') {
      throw new Error('getOtpDebugInfo is only available in development mode');
    }
    this.ensureConnection();
    const key = this.getKey(phone);
    const [otp, ttl, attempts, lockoutUntil] = await Promise.all([
      this.redis.get(key),
      this.redis.ttl(key),
      this.redis.get(`${key}:attempts`),
      this.redis.get(`${key}:lockout`),
    ]);

    let lockoutRemaining: number | null = null;
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil, 10);
      const now = Date.now();
      if (now < lockoutTime) {
        lockoutRemaining = Math.ceil((lockoutTime - now) / 1000);
      }
    }

    return {
      otp,
      ttl,
      attempts: attempts ? parseInt(attempts, 10) : 0,
      isLocked: lockoutRemaining !== null && lockoutRemaining > 0,
      lockoutRemaining,
    };
  }

  private generateOtp(): string {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    const useDevOtp = this.configService.get<boolean>('otp.useDevOtp', false);

    if (
      nodeEnv === 'development' ||
      nodeEnv === 'test' ||
      (nodeEnv !== 'production' && useDevOtp)
    ) {
      return this.configService.get<string>('otp.devOtp', '123456');
    }

    const bytes = crypto.randomBytes(this.otpLength);
    let otp = '';
    for (let i = 0; i < this.otpLength; i++) {
      otp += (bytes[i] % 10).toString();
    }
    return otp;
  }

  private getKey(phone: string): string {
    return `otp:${phone}`;
  }
}
