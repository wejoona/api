/**
 * Notification Provider Interfaces
 * Abstract interfaces for notification delivery providers
 */

import {
  PushNotificationPayload,
  SmsNotificationPayload,
  EmailNotificationPayload,
  DeliveryResult,
} from './notification.types';

/**
 * Push Notification Provider Interface
 */
export interface IPushNotificationProvider {
  readonly name: string;

  /**
   * Send push notification to a single device
   */
  send(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult>;

  /**
   * Send push notification to multiple devices
   */
  sendBatch(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult[]>;

  /**
   * Validate a device token
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * Subscribe token to a topic
   */
  subscribeToTopic?(token: string, topic: string): Promise<void>;

  /**
   * Unsubscribe token from a topic
   */
  unsubscribeFromTopic?(token: string, topic: string): Promise<void>;

  /**
   * Send to topic
   */
  sendToTopic?(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult>;
}

/**
 * SMS Notification Provider Interface
 */
export interface ISmsNotificationProvider {
  readonly name: string;

  /**
   * Send SMS message
   */
  send(payload: SmsNotificationPayload): Promise<DeliveryResult>;

  /**
   * Send batch SMS messages
   */
  sendBatch(payloads: SmsNotificationPayload[]): Promise<DeliveryResult[]>;

  /**
   * Get delivery status
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryResult>;

  /**
   * Validate phone number
   */
  validatePhoneNumber?(phoneNumber: string): Promise<boolean>;
}

/**
 * Email Notification Provider Interface
 */
export interface IEmailNotificationProvider {
  readonly name: string;

  /**
   * Send email
   */
  send(payload: EmailNotificationPayload): Promise<DeliveryResult>;

  /**
   * Send batch emails
   */
  sendBatch(payloads: EmailNotificationPayload[]): Promise<DeliveryResult[]>;

  /**
   * Send using template
   */
  sendWithTemplate?(
    to: string,
    templateId: string,
    data: Record<string, any>,
  ): Promise<DeliveryResult>;

  /**
   * Validate email address
   */
  validateEmail?(email: string): Promise<boolean>;
}

// Provider tokens for dependency injection
export const PUSH_NOTIFICATION_PROVIDER = Symbol('PUSH_NOTIFICATION_PROVIDER');
export const SMS_NOTIFICATION_PROVIDER = Symbol('SMS_NOTIFICATION_PROVIDER');
export const EMAIL_NOTIFICATION_PROVIDER = Symbol(
  'EMAIL_NOTIFICATION_PROVIDER',
);
