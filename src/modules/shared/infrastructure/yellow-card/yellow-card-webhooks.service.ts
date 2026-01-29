import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { YellowCardAuthService } from './yellow-card-auth.service';

/**
 * Yellow Card Webhooks Service
 * Handles webhook signature verification and event processing
 */
@Injectable()
export class YellowCardWebhooksService {
  private readonly logger = new Logger(YellowCardWebhooksService.name);

  constructor(private readonly authService: YellowCardAuthService) {}

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.authService.isMockMode()) {
      return true;
    }

    const config = this.authService.getConfig();
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret || '')
      .update(payload)
      .digest('hex');

    const isValid = signature === expectedSignature;

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
    }

    return isValid;
  }
}
