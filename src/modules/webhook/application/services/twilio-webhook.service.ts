import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface SmsStatusUpdate {
  messageSid: string;
  status: string;
  to: string;
  from: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Twilio Webhook Service
 *
 * Processes Twilio SMS delivery status callbacks
 * Stores delivery status in Redis for tracking
 * Emits events for other parts of the system
 */
@Injectable()
export class TwilioWebhookService {
  private readonly logger = new Logger(TwilioWebhookService.name);
  private readonly redis: Redis;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    // Initialize Redis for status tracking
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  /**
   * Handle SMS status callback from Twilio
   */
  async handleStatusCallback(update: SmsStatusUpdate): Promise<void> {
    this.logger.log(
      `Processing SMS status update: ${update.messageSid} -> ${update.status}`,
    );

    // Store status in Redis
    await this.storeDeliveryStatus(update);

    // Log delivery failures
    if (update.status === 'failed' || update.status === 'undelivered') {
      this.logger.warn(
        `SMS delivery failed: ${update.messageSid} to ${update.to}` +
          (update.errorCode ? ` - Error ${update.errorCode}: ${update.errorMessage}` : ''),
      );
    }

    // Emit event for other services
    this.eventEmitter.emit('sms.status.updated', {
      messageSid: update.messageSid,
      status: this.mapTwilioStatus(update.status),
      to: update.to,
      errorCode: update.errorCode,
      errorMessage: update.errorMessage,
      timestamp: new Date(),
    });

    // Track metrics
    await this.trackDeliveryMetrics(update);
  }

  /**
   * Store delivery status in Redis
   */
  private async storeDeliveryStatus(update: SmsStatusUpdate): Promise<void> {
    const key = `sms_delivery:${update.messageSid}`;
    const data = {
      status: update.status,
      to: update.to,
      from: update.from,
      errorCode: update.errorCode,
      errorMessage: update.errorMessage,
      updatedAt: new Date().toISOString(),
    };

    // Store for 7 days
    await this.redis.setex(key, 604800, JSON.stringify(data));
  }

  /**
   * Track delivery metrics
   */
  private async trackDeliveryMetrics(update: SmsStatusUpdate): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const statusKey = `sms_metrics:${date}:${update.status}`;
    const totalKey = `sms_metrics:${date}:total`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(statusKey);
    pipeline.expire(statusKey, 2592000); // 30 days
    pipeline.incr(totalKey);
    pipeline.expire(totalKey, 2592000); // 30 days

    // Track per-country metrics
    const countryCode = this.extractCountryCode(update.to);
    if (countryCode) {
      const countryKey = `sms_metrics:${date}:country:${countryCode}`;
      pipeline.incr(countryKey);
      pipeline.expire(countryKey, 2592000);
    }

    await pipeline.exec();
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageSid: string): Promise<any | null> {
    const key = `sms_delivery:${messageSid}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Get delivery metrics for a date
   */
  async getMetrics(date: string): Promise<{
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    undelivered: number;
  }> {
    const keys = [
      `sms_metrics:${date}:total`,
      `sms_metrics:${date}:queued`,
      `sms_metrics:${date}:sent`,
      `sms_metrics:${date}:delivered`,
      `sms_metrics:${date}:failed`,
      `sms_metrics:${date}:undelivered`,
    ];

    const values = await this.redis.mget(...keys);

    return {
      total: parseInt(values[0] || '0', 10),
      queued: parseInt(values[1] || '0', 10),
      sent: parseInt(values[2] || '0', 10),
      delivered: parseInt(values[3] || '0', 10),
      failed: parseInt(values[4] || '0', 10),
      undelivered: parseInt(values[5] || '0', 10),
    };
  }

  /**
   * Map Twilio status to standard status
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
    return statusMap[twilioStatus.toLowerCase()] || 'queued';
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryCode(phone: string): string | null {
    // Extract country code from international format
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? match[1] : null;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed for Twilio webhook service');
    }
  }
}
