import { Injectable, Logger, OnModuleDestroy, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import {
  ISmsGateway,
  SMS_GATEWAY,
} from '../../../../shared/domain/gateways/sms.gateway';

@Injectable()
export class OtpService implements OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;
  private readonly otpExpiry: number;
  private readonly otpLength: number;
  private readonly maxAttempts: number;
  private readonly rateLimitWindow: number = 3600; // 1 hour window for rate limiting
  private readonly maxOtpRequestsPerHour: number = 5;
  private isRedisConnected = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(SMS_GATEWAY) private readonly smsGateway: ISmsGateway,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, waiting ${delay}ms`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Redis connection event handlers
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('close', () => {
      this.isRedisConnected = false;
      this.logger.warn('Redis connection closed');
    });

    this.otpExpiry = this.configService.get<number>('otp.expiresIn') || 300;
    this.otpLength = this.configService.get<number>('otp.length') || 6;
    this.maxAttempts = this.configService.get<number>('otp.maxAttempts') || 3;

    this.logger.log(
      `OtpService initialized with SMS provider: ${this.smsGateway.providerName}`,
    );
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  private ensureConnection(): void {
    if (!this.isRedisConnected) {
      throw new Error('Redis connection unavailable. Please try again later.');
    }
  }

  async sendOtp(phone: string): Promise<void> {
    this.ensureConnection();

    // Rate limiting: check how many OTPs requested in the last hour
    const rateLimitKey = `otp_rate:${phone}`;
    const requestCount = await this.redis.get(rateLimitKey);

    if (requestCount && parseInt(requestCount, 10) >= this.maxOtpRequestsPerHour) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }

    const otp = this.generateOtp();
    const key = this.getKey(phone);

    // Store OTP in Redis with expiry
    await this.redis.setex(key, this.otpExpiry, otp);

    // Reset attempts counter for this OTP
    await this.redis.setex(`${key}:attempts`, this.otpExpiry, '0');

    // Increment rate limit counter
    const pipeline = this.redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, this.rateLimitWindow);
    await pipeline.exec();

    // Log OTP in development mode for debugging
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      this.logger.debug(`OTP for ${phone}: ${otp}`);
    }

    // Send OTP via SMS gateway
    try {
      const result = await this.smsGateway.sendOtp(phone, otp);
      this.logger.log(
        `OTP sent to ${phone} via ${this.smsGateway.providerName}: ${result.id}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send OTP to ${phone}: ${errorMessage}`);
      // Don't throw - OTP is stored, user can request resend
      // In production, you might want to throw or implement retry logic
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    this.ensureConnection();

    const key = this.getKey(phone);
    const attemptsKey = `${key}:attempts`;

    // Check if locked out due to too many attempts
    const attempts = await this.redis.get(attemptsKey);
    if (attempts && parseInt(attempts, 10) >= this.maxAttempts) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(storedOtp),
      Buffer.from(otp.padEnd(storedOtp.length)),
    ) && storedOtp.length === otp.length;

    if (!isValid) {
      // Increment failed attempts
      await this.redis.incr(attemptsKey);
      return false;
    }

    // Delete OTP and attempts after successful verification
    await this.redis.del(key);
    await this.redis.del(attemptsKey);
    return true;
  }

  async resendOtp(phone: string): Promise<void> {
    this.ensureConnection();

    // Delete existing OTP and send new one
    const key = this.getKey(phone);
    await this.redis.del(key);
    await this.sendOtp(phone);
  }

  private generateOtp(): string {
    // Use cryptographically secure random number generation
    const bytes = crypto.randomBytes(this.otpLength);
    let otp = '';
    for (let i = 0; i < this.otpLength; i++) {
      // Use modulo to get a digit 0-9 from each byte
      otp += (bytes[i] % 10).toString();
    }
    return otp;
  }

  private getKey(phone: string): string {
    return `otp:${phone}`;
  }
}
