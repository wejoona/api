/**
 * Push Notification Gateway Interface
 *
 * Generic interface for push notification providers.
 * Currently implemented by MockPushGateway, but can be swapped for:
 * - Firebase Cloud Messaging (FCM)
 * - Apple Push Notification Service (APNS)
 * - OneSignal
 * - AWS SNS
 */

export interface SendPushRequest {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
}

export interface SendMulticastPushRequest {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  priority?: 'high' | 'normal';
}

export interface PushResponse {
  id: string;
  success: boolean;
  deviceToken: string;
  failureReason?: string;
  provider: string;
  createdAt: Date;
}

export interface MulticastPushResponse {
  successCount: number;
  failureCount: number;
  responses: PushResponse[];
}

export interface IPushGateway {
  // Provider identification
  readonly providerName: string;

  /**
   * Send push notification to a single device
   */
  send(request: SendPushRequest): Promise<PushResponse>;

  /**
   * Send push notification to multiple devices
   */
  sendMulticast(
    request: SendMulticastPushRequest,
  ): Promise<MulticastPushResponse>;

  /**
   * Subscribe device to a topic (for topic-based notifications)
   */
  subscribeToTopic(deviceToken: string, topic: string): Promise<boolean>;

  /**
   * Unsubscribe device from a topic
   */
  unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean>;

  /**
   * Send notification to all devices subscribed to a topic
   */
  sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ messageId: string }>;
}

// Injection token for the Push gateway
export const PUSH_GATEWAY = Symbol('PUSH_GATEWAY');
