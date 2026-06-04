import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../../domain/gateways/sms.gateway';
import {
  closeRedisClient,
  createConfiguredRedisClient,
} from '@/common/redis/redis-client.helper';

// Use require for Twilio to avoid esModule issues
const twilio = require('twilio');
type Twilio = ReturnType<typeof twilio>;

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  messagingServiceSid?: string;
  maxRetries: number;
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
  rateLimit: {
    maxPerMinute: number;
    maxPerHour: number;
  };
}

/**
 * Enhanced Twilio SMS Gateway Adapter
 *
 * Features:
 * - Twilio SDK integration
 * - Rate limiting per phone number
 * - Retry logic with exponential backoff
 * - Multi-language support (French/English)
 * - Delivery status tracking
 * - Character count optimization
 * - Messaging Service SID support
 * - Redis-based rate limiting
 *
 * Configuration:
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: From phone number
 * - TWILIO_MESSAGING_SERVICE_SID: (Optional) Messaging service SID
 * - TWILIO_MAX_RETRIES: Max retry attempts (default: 3)
 * - TWILIO_RATE_LIMIT_PER_MINUTE: Max SMS per minute per phone (default: 5)
 * - TWILIO_RATE_LIMIT_PER_HOUR: Max SMS per hour per phone (default: 10)
 */
@Injectable()
export class TwilioSmsAdapter implements ISmsGateway, OnModuleDestroy {
  private readonly logger = new Logger(TwilioSmsAdapter.name);
  private readonly twilioClient: Twilio;
  private readonly config: TwilioConfig;
  private readonly redis: Redis;
  private readonly useDevMode: boolean;
  private isShuttingDown = false;

  readonly providerName = 'twilio';

  constructor(private readonly configService: ConfigService) {
    // Load configuration
    this.config = this.loadConfig();

    // Initialize Twilio client
    this.twilioClient = twilio(this.config.accountSid, this.config.authToken);

    this.redis = createConfiguredRedisClient(this.configService, this.logger, {
      retryLogContext: 'Twilio SMS',
      isShuttingDown: () => this.isShuttingDown,
    });

    // Check if using dev mode (bypass Twilio)
    this.useDevMode =
      this.configService.get<string>('nodeEnv') === 'development';

    this.redis.on('error', (error) => {
      if (this.isShuttingDown) {
        return;
      }
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.logger.log(
      `Twilio SMS adapter initialized (${this.useDevMode ? 'DEV MODE' : 'PRODUCTION'})`,
    );
  }

  private loadConfig(): TwilioConfig {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      this.logger.warn(
        'Twilio credentials not configured. SMS sending will be simulated in dev mode.',
      );
    }

    return {
      accountSid: accountSid || '',
      authToken: authToken || '',
      phoneNumber: phoneNumber || '',
      messagingServiceSid: this.configService.get<string>(
        'TWILIO_MESSAGING_SERVICE_SID',
      ),
      maxRetries: this.configService.get<number>('TWILIO_MAX_RETRIES', 3),
      initialRetryDelayMs: this.configService.get<number>(
        'TWILIO_INITIAL_RETRY_DELAY_MS',
        1000,
      ),
      maxRetryDelayMs: this.configService.get<number>(
        'TWILIO_MAX_RETRY_DELAY_MS',
        10000,
      ),
      rateLimit: {
        maxPerMinute: this.configService.get<number>(
          'TWILIO_RATE_LIMIT_PER_MINUTE',
          5,
        ),
        maxPerHour: this.configService.get<number>(
          'TWILIO_RATE_LIMIT_PER_HOUR',
          10,
        ),
      },
    };
  }

  async send(request: SendSmsRequest): Promise<SmsResponse> {
    // Dev mode: simulate successful send
    if (this.useDevMode) {
      return this.simulateSend(request);
    }

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Check rate limits
    await this.checkRateLimit(request.to);

    // Send with retry logic
    return this.sendWithRetry(request);
  }

  async sendOtp(phone: string, otp: string): Promise<SmsResponse> {
    // Determine language from phone prefix (West African region)
    const language = this.detectLanguage(phone);

    // Get optimized message template
    const message = this.getOtpMessage(otp, language);

    return this.send({
      to: phone,
      message,
    });
  }

  async getStatus(messageId: string): Promise<SmsResponse> {
    // Dev mode: return mock status
    if (this.useDevMode || messageId.startsWith('DEV_')) {
      return {
        id: messageId,
        to: '+2250700000000',
        status: 'delivered',
        provider: this.providerName,
        createdAt: new Date(),
      };
    }

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();

      return {
        id: message.sid,
        to: message.to,
        status: this.mapTwilioStatus(message.status),
        provider: this.providerName,
        createdAt: new Date(message.dateCreated),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get SMS status from Twilio: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Send SMS with exponential backoff retry logic
   */
  private async sendWithRetry(
    request: SendSmsRequest,
    attempt = 1,
  ): Promise<SmsResponse> {
    try {
      const messageOptions: any = {
        to: request.to,
        body: request.message,
      };

      // Use Messaging Service SID if configured, otherwise use from number
      if (this.config.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.messagingServiceSid;
      } else {
        messageOptions.from = this.config.phoneNumber;
      }

      const message = await this.twilioClient.messages.create(messageOptions);

      this.logger.log(
        `SMS sent successfully to ${request.to}: ${message.sid} (attempt ${attempt})`,
      );

      // Increment rate limit counters
      await this.incrementRateLimitCounters(request.to);

      return {
        id: message.sid,
        to: message.to,
        status: this.mapTwilioStatus(message.status),
        provider: this.providerName,
        createdAt: new Date(message.dateCreated),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send SMS via Twilio (attempt ${attempt}): ${errorMessage}`,
      );

      // Check if we should retry
      if (attempt < this.config.maxRetries && this.isRetryableError(error)) {
        const delayMs = this.calculateRetryDelay(attempt);
        this.logger.log(
          `Retrying SMS send in ${delayMs}ms (attempt ${attempt + 1}/${this.config.maxRetries})`,
        );
        await this.sleep(delayMs);
        return this.sendWithRetry(request, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and server errors
    const retryableErrorCodes = [
      20429, // Too many requests
      20500, // Internal server error
      20503, // Service unavailable
      30001, // Queue overflow
      30002, // Account suspended
      30003, // Unreachable destination
      30005, // Unknown destination
      30006, // Landline or unreachable
    ];

    if (error.code && retryableErrorCodes.includes(error.code)) {
      return true;
    }

    // Retry on network errors
    if (
      error.message &&
      (error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND'))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const delay =
      this.config.initialRetryDelayMs * Math.pow(2, attempt - 1) +
      Math.random() * 1000; // Add jitter
    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  /**
   * Check rate limits for phone number
   */
  private async checkRateLimit(phone: string): Promise<void> {
    const minuteKey = `twilio_rate:${phone}:minute`;
    const hourKey = `twilio_rate:${phone}:hour`;

    const [minuteCount, hourCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey),
    ]);

    const minute = minuteCount ? parseInt(minuteCount, 10) : 0;
    const hour = hourCount ? parseInt(hourCount, 10) : 0;

    if (minute >= this.config.rateLimit.maxPerMinute) {
      throw new Error(
        `Rate limit exceeded: ${this.config.rateLimit.maxPerMinute} SMS per minute`,
      );
    }

    if (hour >= this.config.rateLimit.maxPerHour) {
      throw new Error(
        `Rate limit exceeded: ${this.config.rateLimit.maxPerHour} SMS per hour`,
      );
    }
  }

  /**
   * Increment rate limit counters
   */
  private async incrementRateLimitCounters(phone: string): Promise<void> {
    const minuteKey = `twilio_rate:${phone}:minute`;
    const hourKey = `twilio_rate:${phone}:hour`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60); // 1 minute
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 3600); // 1 hour
    await pipeline.exec();
  }

  /**
   * Detect language from phone number
   */
  private detectLanguage(phone: string): 'fr' | 'en' {
    // West African country codes (French-speaking)
    const frenchCountryCodes = [
      '+225', // Côte d'Ivoire
      '+221', // Senegal
      '+223', // Mali
      '+226', // Burkina Faso
      '+227', // Niger
      '+228', // Togo
      '+229', // Benin
      '+237', // Cameroon
      '+241', // Gabon
      '+242', // Congo
      '+243', // DRC
    ];

    for (const code of frenchCountryCodes) {
      if (phone.startsWith(code)) {
        return 'fr';
      }
    }

    return 'en';
  }

  /**
   * Get optimized OTP message template
   * Character count optimized for SMS (160 chars for single message)
   */
  private getOtpMessage(otp: string, language: 'fr' | 'en'): string {
    const templates = {
      fr: `Votre code JoonaPay est: ${otp}. Valide 5 min. Ne le partagez pas.`, // 67 chars
      en: `Your JoonaPay code is: ${otp}. Valid for 5 min. Don't share it.`, // 66 chars
    };

    return templates[language];
  }

  /**
   * Map Twilio status to our standard status
   */
  private mapTwilioStatus(
    twilioStatus: string,
  ): 'queued' | 'sent' | 'delivered' | 'failed' {
    const statusMap: Record<
      string,
      'queued' | 'sent' | 'delivered' | 'failed'
    > = {
      queued: 'queued',
      accepted: 'queued',
      scheduled: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
      canceled: 'failed',
    };
    return statusMap[twilioStatus] || 'queued';
  }

  /**
   * Simulate SMS send in dev mode
   */
  private async simulateSend(request: SendSmsRequest): Promise<SmsResponse> {
    this.logger.debug(
      `[DEV MODE] Simulating SMS send to ${request.to}: ${request.message}`,
    );

    // Simulate network delay
    await this.sleep(100);

    return {
      id: `DEV_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      to: request.to,
      status: 'delivered',
      provider: this.providerName,
      createdAt: new Date(),
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.isShuttingDown = true;

    await closeRedisClient(this.redis, this.logger, 'Redis Twilio SMS');
  }
}
