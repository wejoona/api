import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPushGateway,
  SendPushRequest,
  SendMulticastPushRequest,
  PushResponse,
  MulticastPushResponse,
} from '../../../domain/gateways/push.gateway';

interface FcmMessage {
  message: {
    token?: string;
    topic?: string;
    notification: {
      title: string;
      body: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'HIGH' | 'NORMAL';
      notification?: {
        sound?: string;
      };
    };
    apns?: {
      payload: {
        aps: {
          badge?: number;
          sound?: string;
        };
      };
    };
  };
}

interface FcmResponse {
  name: string;
}

interface FcmError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Firebase Cloud Messaging (FCM) Push Notification Adapter
 *
 * Implements IPushGateway using Firebase Cloud Messaging HTTP v1 API.
 * Requires: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
 */
@Injectable()
export class FcmPushAdapter implements IPushGateway {
  private readonly logger = new Logger(FcmPushAdapter.name);
  private readonly projectId: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  readonly providerName = 'fcm';

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('fcm.projectId') || '';
    this.clientEmail = this.configService.get<string>('fcm.clientEmail') || '';
    this.privateKey = this.configService.get<string>('fcm.privateKey') || '';
    this.baseUrl = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

    if (!this.projectId || !this.clientEmail || !this.privateKey) {
      this.logger.warn('FCM credentials not configured. Push notifications will fail.');
    } else {
      this.logger.log('FCM Push adapter initialized');
    }
  }

  async send(request: SendPushRequest): Promise<PushResponse> {
    try {
      const token = await this.getAccessToken();

      const fcmMessage: FcmMessage = {
        message: {
          token: request.deviceToken,
          notification: {
            title: request.title,
            body: request.body,
            image: request.imageUrl,
          },
          data: request.data,
          android: {
            priority: request.priority === 'high' ? 'HIGH' : 'NORMAL',
            notification: {
              sound: request.sound || 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                badge: request.badge,
                sound: request.sound || 'default',
              },
            },
          },
        },
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fcmMessage),
      });

      if (!response.ok) {
        const error = (await response.json()) as FcmError;
        throw new Error(`FCM error: ${error.error.message}`);
      }

      const result = (await response.json()) as FcmResponse;

      this.logger.log(`Push notification sent: ${result.name}`);

      return {
        id: result.name,
        success: true,
        deviceToken: request.deviceToken,
        provider: this.providerName,
        createdAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send FCM push notification: ${errorMessage}`);

      return {
        id: `error_${Date.now()}`,
        success: false,
        deviceToken: request.deviceToken,
        failureReason: errorMessage,
        provider: this.providerName,
        createdAt: new Date(),
      };
    }
  }

  async sendMulticast(request: SendMulticastPushRequest): Promise<MulticastPushResponse> {
    // FCM HTTP v1 API doesn't support multicast directly
    // We need to send individual requests
    const responses: PushResponse[] = [];

    for (const token of request.deviceTokens) {
      const response = await this.send({
        deviceToken: token,
        title: request.title,
        body: request.body,
        data: request.data,
        imageUrl: request.imageUrl,
        sound: request.sound,
        priority: request.priority,
      });
      responses.push(response);
    }

    return {
      successCount: responses.filter((r) => r.success).length,
      failureCount: responses.filter((r) => !r.success).length,
      responses,
    };
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://iid.googleapis.com/iid/v1/${deviceToken}/rel/topics/${topic}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to subscribe to topic: ${response.statusText}`);
      }

      this.logger.log(`Device subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to subscribe to topic: ${errorMessage}`);
      return false;
    }
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://iid.googleapis.com/iid/v1/${deviceToken}/rel/topics/${topic}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to unsubscribe from topic: ${response.statusText}`);
      }

      this.logger.log(`Device unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to unsubscribe from topic: ${errorMessage}`);
      return false;
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ messageId: string }> {
    try {
      const token = await this.getAccessToken();

      const fcmMessage: FcmMessage = {
        message: {
          topic,
          notification: {
            title,
            body,
          },
          data,
        },
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fcmMessage),
      });

      if (!response.ok) {
        const error = (await response.json()) as FcmError;
        throw new Error(`FCM error: ${error.error.message}`);
      }

      const result = (await response.json()) as FcmResponse;

      this.logger.log(`Topic notification sent: ${result.name}`);
      return { messageId: result.name };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send FCM topic notification: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get OAuth2 access token for FCM API
   * Uses service account credentials
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    // Create JWT claims
    const claims = {
      iss: this.clientEmail,
      sub: this.clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    // Sign JWT (simplified - in production use proper JWT library)
    const jwt = await this.signJwt(header, claims, this.privateKey);

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get FCM access token: ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000 - 60000); // 1 min buffer

    return this.accessToken;
  }

  /**
   * Sign JWT with RS256
   */
  private async signJwt(
    header: object,
    claims: object,
    privateKey: string,
  ): Promise<string> {
    const crypto = await import('crypto');

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }
}
