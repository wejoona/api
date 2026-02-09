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
      const { data } = await firstValueFrom(
        this.httpService.post<NtmSendResponse>(
          `${this.baseUrl}/api/v1/notifications/send`,
          notification,
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
      const { data } = await firstValueFrom(
        this.httpService.post<NtmSendBulkResponse>(
          `${this.baseUrl}/api/v1/notifications/send-bulk`,
          { notifications },
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

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
    };
  }
}
