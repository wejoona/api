import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class OtpService implements OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;
  private readonly otpExpiry: number;
  private readonly otpLength: number;
  private isRedisConnected = false;

  constructor(private readonly configService: ConfigService) {
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

    // In production, integrate with SMS provider (e.g., Twilio, Africa's Talking)
    // For now, log the OTP (NEVER do this in production!)
    this.logger.debug(`OTP for ${phone}: ${otp}`);

    // TODO: Integrate with SMS provider
    // await this.smsService.send(phone, `Your verification code is: ${otp}`);
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
