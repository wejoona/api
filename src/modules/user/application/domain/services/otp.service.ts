import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
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

    const otp = this.generateOtp();
    const key = this.getKey(phone);

    // Store OTP in Redis with expiry
    await this.redis.setex(key, this.otpExpiry, otp);

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
    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      return false;
    }

    if (storedOtp !== otp) {
      return false;
    }

    // Delete OTP after successful verification
    await this.redis.del(key);
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
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.otpLength; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  private getKey(phone: string): string {
    return `otp:${phone}`;
  }
}
