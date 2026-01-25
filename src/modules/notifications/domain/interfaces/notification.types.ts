/**
 * Notification Types
 * Shared types for notification system
 */

// Notification channels
export type NotificationChannel = 'push' | 'sms' | 'email' | 'in_app';

// Notification categories
export type NotificationCategory =
  | 'transaction'
  | 'kyc'
  | 'security'
  | 'marketing'
  | 'system'
  | 'risk'
  | 'referral';

// Notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// Delivery status
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// Notification payload
export interface NotificationPayload {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  deepLink?: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  templateId?: string;
  templateData?: Record<string, any>;
  expiresAt?: Date;
  scheduledAt?: Date;
}

// Push notification specific
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  badge?: number;
  sound?: string;
  channelId?: string; // Android channel
  collapseKey?: string;
  priority?: 'normal' | 'high';
  ttlSeconds?: number;
}

// SMS notification specific
export interface SmsNotificationPayload {
  phoneNumber: string;
  message: string;
  senderId?: string;
}

// Email notification specific
export interface EmailNotificationPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

// Device token
export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  provider: 'fcm' | 'apns' | 'web_push';
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// User notification preferences
export interface NotificationPreferences {
  userId: string;
  channels: {
    push: boolean;
    sms: boolean;
    email: boolean;
    inApp: boolean;
  };
  categories: {
    transaction: boolean;
    kyc: boolean;
    security: boolean;
    marketing: boolean;
    system: boolean;
    risk: boolean;
    referral: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    timezone: string;
  };
  language: string;
  updatedAt: Date;
}

// Notification delivery result
export interface DeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  providerMessageId?: string;
  error?: string;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}

// Notification history entry
export interface NotificationHistoryEntry {
  id: string;
  userId: string;
  notificationId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  deliveryResults: DeliveryResult[];
  readAt?: Date;
  createdAt: Date;
}

// Notification template
export interface NotificationTemplate {
  id: string;
  code: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  title: Record<string, string>; // Localized titles
  body: Record<string, string>; // Localized bodies
  pushTitle?: Record<string, string>;
  pushBody?: Record<string, string>;
  smsBody?: Record<string, string>;
  emailSubject?: Record<string, string>;
  emailHtmlBody?: Record<string, string>;
  defaultData?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification events
export interface TransactionNotificationEvent {
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received';
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  recipientName?: string;
  senderName?: string;
  status: string;
}

export interface KycNotificationEvent {
  type: 'submitted' | 'approved' | 'rejected' | 'requires_review';
  userId: string;
  kycId: string;
  rejectionReason?: string;
}

export interface SecurityNotificationEvent {
  type: 'login' | 'password_changed' | 'new_device' | 'suspicious_activity';
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

export interface RiskNotificationEvent {
  type: 'transaction_blocked' | 'step_up_required' | 'sanctions_match';
  userId: string;
  transactionId?: string;
  reason: string;
}

export interface ReferralNotificationEvent {
  type: 'referral_signed_up' | 'reward_earned' | 'reward_credited';
  userId: string;
  refereeId?: string;
  rewardAmount?: number;
  rewardCurrency?: string;
}
