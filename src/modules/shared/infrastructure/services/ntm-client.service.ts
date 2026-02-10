import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface NtmNotification {
  template: string;
  channel: 'push' | 'sms' | 'email';
  recipient: {
    userId?: string;
    phone?: string;
    email?: string;
    deviceToken?: string;
  };
  variables: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface NtmSendResponse {
  deliveryId: string;
}

export interface NtmSendBulkResponse {
  deliveryIds: string[];
}

@Injectable()
export class NtmClientService {
  private readonly logger = new Logger(NtmClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('ntm.baseUrl') || 'http://ntm:3100';
    this.apiKey = this.configService.get<string>('ntm.apiKey') || '';
    this.useMock = this.configService.get<boolean>('ntm.useMock') ?? true;
  }

  async send(notification: NtmNotification): Promise<NtmSendResponse> {
    if (this.useMock) {
      this.logger.log(
        `[NTM Mock] send: ${JSON.stringify(notification)}`,
      );
      return { deliveryId: `mock-${Date.now()}` };
    }

    try {
      // Convert to NTM API format
      const ntmPayload = this.mapToNtmFormat(notification);
      
      const { data } = await firstValueFrom(
        this.httpService.post<NtmSendResponse>(
          `${this.baseUrl}/api/v1/notifications/send`,
          ntmPayload,
          { headers: this.getHeaders() },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `[NTM] Failed to send notification: ${error.message}`,
        error.stack,
      );
      return { deliveryId: '' };
    }
  }

  async sendBulk(
    notifications: NtmNotification[],
  ): Promise<NtmSendBulkResponse> {
    if (this.useMock) {
      this.logger.log(
        `[NTM Mock] sendBulk: ${notifications.length} notifications`,
      );
      return {
        deliveryIds: notifications.map((_, i) => `mock-bulk-${Date.now()}-${i}`),
      };
    }

    try {
      // Convert all notifications to NTM format
      const ntmPayloads = notifications.map(notification => 
        this.mapToNtmFormat(notification)
      );

      const { data } = await firstValueFrom(
        this.httpService.post<NtmSendBulkResponse>(
          `${this.baseUrl}/api/v1/notifications/send-bulk`,
          { notifications: ntmPayloads },
          { headers: this.getHeaders() },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `[NTM] Failed to send bulk notifications: ${error.message}`,
        error.stack,
      );
      return { deliveryIds: [] };
    }
  }

  /**
   * Map internal notification format to NTM API format
   */
  private mapToNtmFormat(notification: NtmNotification): any {
    // Determine recipient address based on channel
    let recipientAddress: string;
    let recipientId: string = notification.recipient.userId || 'unknown';

    switch (notification.channel) {
      case 'push':
        recipientAddress = notification.recipient.deviceToken || '';
        break;
      case 'sms':
        recipientAddress = notification.recipient.phone || '';
        break;
      case 'email':
        recipientAddress = notification.recipient.email || '';
        break;
      default:
        recipientAddress = '';
    }

    // Map to NTM SendNotificationDto format
    return {
      templateSlug: notification.template,
      channel: notification.channel,
      recipientId: recipientId,
      recipientAddress: recipientAddress,
      context: notification.variables,
      tenantId: '00000000-0000-0000-0000-000000000001', // Default tenant ID
      locale: 'fr', // Default locale
      priority: notification.priority || 'normal',
      metadata: {
        source: 'korido',
        originalPriority: notification.priority,
      },
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
    };
  }
}
