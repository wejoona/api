/**
 * Notification API Contracts
 *
 * Defines notification contracts consumed by mobile notification list, badge,
 * read actions, and push-token registration flows.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  optional,
  required,
} from './types';

export const NotificationSchema: ContractSchema = {
  name: 'Notification',
  description: 'Single in-app notification item',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Notification ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    type: required(FieldType.STRING, {
      description: 'Notification type',
      enum: [
        'transfer_received',
        'transfer_sent',
        'transfer_failed',
        'deposit_completed',
        'deposit_failed',
        'withdrawal_completed',
        'withdrawal_failed',
        'kyc_approved',
        'kyc_rejected',
        'low_balance',
        'system',
        'promotional',
      ],
      example: 'transfer_received',
    }),
    presentationType: required(FieldType.STRING, {
      description: 'Stable mobile display type derived from backend type',
      enum: [
        'transactionComplete',
        'transactionFailed',
        'securityAlert',
        'promotion',
        'lowBalance',
        'general',
        'transfer',
        'deposit',
        'withdrawal',
        'security',
        'kyc',
        'newDeviceLogin',
        'largeTransaction',
        'withdrawalPending',
        'addressWhitelisted',
        'priceAlert',
        'weeklySpendingSummary',
      ],
      example: 'transfer',
    }),
    severity: required(FieldType.STRING, {
      description: 'Stable severity for mobile color and priority treatment',
      enum: ['info', 'success', 'warning', 'critical'],
      example: 'success',
    }),
    action: required(FieldType.STRING, {
      description: 'Stable mobile action target for notification taps',
      enum: [
        'open_transaction',
        'open_kyc',
        'open_security',
        'open_wallet',
        'none',
      ],
      example: 'open_transaction',
    }),
    status: required(FieldType.STRING, {
      description: 'Delivery/read status',
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      example: 'delivered',
    }),
    title: required(FieldType.STRING, {
      description: 'Display title',
      example: 'Payment received',
    }),
    body: required(FieldType.STRING, {
      description: 'Display body',
      example: 'You received 50.00 USDC from Ama.',
    }),
    data: required(FieldType.OBJECT, {
      description: 'Structured metadata for navigation and display',
      example: { transactionId: '123e4567-e89b-12d3-a456-426614174001' },
    }),
    referenceType: nullable(FieldType.STRING, {
      description: 'Referenced entity type',
      example: 'transaction',
    }),
    referenceId: nullable(FieldType.UUID, {
      description: 'Referenced entity ID',
      example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    sentAt: nullable(FieldType.DATE, {
      description: 'Sent timestamp',
      example: '2026-06-04T10:30:00.000Z',
    }),
    deliveredAt: nullable(FieldType.DATE, {
      description: 'Delivered timestamp',
      example: '2026-06-04T10:30:05.000Z',
    }),
    readAt: nullable(FieldType.DATE, {
      description: 'Read timestamp; mobile derives read state from this',
      example: null,
    }),
    createdAt: required(FieldType.DATE, {
      description: 'Creation timestamp',
      example: '2026-06-04T10:30:00.000Z',
    }),
    isUnread: required(FieldType.BOOLEAN, {
      description: 'Backend unread flag for badges and list styling',
      example: true,
    }),
    actionUrl: optional(FieldType.STRING, {
      description: 'Optional deep-link/action URL when provided',
      example: '/transactions/123e4567-e89b-12d3-a456-426614174001',
    }),
  },
};

export const NotificationListResponseSchema: ContractSchema = {
  name: 'NotificationListResponse',
  description: 'Paginated notification list',
  fields: {
    notifications: required(FieldType.ARRAY, {
      description: 'Notification items',
      itemType: NotificationSchema,
    }),
    total: required(FieldType.NUMBER, {
      description: 'Total notification count',
      example: 42,
    }),
    unreadCount: required(FieldType.NUMBER, {
      description: 'Unread notification count',
      example: 5,
    }),
    limit: required(FieldType.NUMBER, {
      description: 'Pagination limit',
      example: 20,
    }),
    offset: required(FieldType.NUMBER, {
      description: 'Pagination offset',
      example: 0,
    }),
  },
};

export const UnreadCountResponseSchema: ContractSchema = {
  name: 'UnreadCountResponse',
  description: 'Unread notification count response',
  fields: {
    count: required(FieldType.NUMBER, {
      description: 'Unread count',
      example: 7,
    }),
  },
};

export const NotificationPreferenceChannelsSchema: ContractSchema = {
  name: 'NotificationPreferenceChannels',
  description: 'Grouped mobile channel notification toggles',
  fields: {
    push: required(FieldType.BOOLEAN, { example: true }),
    email: required(FieldType.BOOLEAN, { example: true }),
    sms: required(FieldType.BOOLEAN, { example: true }),
    inApp: required(FieldType.BOOLEAN, { example: true }),
  },
};

export const NotificationPreferenceCategoriesSchema: ContractSchema = {
  name: 'NotificationPreferenceCategories',
  description: 'Grouped mobile category notification toggles',
  fields: {
    transaction: required(FieldType.BOOLEAN, { example: true }),
    security: required(FieldType.BOOLEAN, { example: true }),
    marketing: required(FieldType.BOOLEAN, { example: false }),
    system: required(FieldType.BOOLEAN, { example: true }),
  },
};

export const NotificationPreferencesResponseSchema: ContractSchema = {
  name: 'NotificationPreferencesResponse',
  description: 'Current user notification preferences consumed by settings',
  fields: {
    id: required(FieldType.UUID, {
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    userId: required(FieldType.UUID, {
      example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    pushEnabled: required(FieldType.BOOLEAN, { example: true }),
    pushTransactions: required(FieldType.BOOLEAN, { example: true }),
    pushSecurity: required(FieldType.BOOLEAN, { example: true }),
    pushMarketing: required(FieldType.BOOLEAN, { example: false }),
    emailEnabled: required(FieldType.BOOLEAN, { example: true }),
    emailTransactions: required(FieldType.BOOLEAN, { example: true }),
    emailMonthlyStatement: required(FieldType.BOOLEAN, { example: true }),
    emailMarketing: required(FieldType.BOOLEAN, { example: false }),
    smsEnabled: required(FieldType.BOOLEAN, { example: true }),
    smsTransactions: required(FieldType.BOOLEAN, { example: true }),
    smsSecurity: required(FieldType.BOOLEAN, { example: true }),
    largeTransactionThreshold: required(FieldType.NUMBER, { example: 1000 }),
    lowBalanceThreshold: required(FieldType.NUMBER, { example: 100 }),
    channels: required(FieldType.OBJECT, {
      nestedSchema: NotificationPreferenceChannelsSchema,
    }),
    categories: required(FieldType.OBJECT, {
      nestedSchema: NotificationPreferenceCategoriesSchema,
    }),
    createdAt: required(FieldType.DATE, {
      example: '2026-06-04T10:30:00.000Z',
    }),
    updatedAt: required(FieldType.DATE, {
      example: '2026-06-04T10:30:00.000Z',
    }),
  },
};

export const PushTokenRegistrationRequestSchema: ContractSchema = {
  name: 'PushTokenRegistrationRequest',
  description: 'Register mobile push token',
  fields: {
    token: required(FieldType.STRING, {
      description: 'Push token',
      example: 'fcm-token-123',
      minLength: 1,
      maxLength: 500,
    }),
    platform: required(FieldType.STRING, {
      description: 'Platform',
      enum: ['ios', 'android', 'web'],
      example: 'ios',
    }),
    deviceId: optional(FieldType.STRING, {
      description: 'Device identifier',
      example: 'device-123',
    }),
    deviceName: optional(FieldType.STRING, {
      description: 'Device display name',
      example: 'Ben iPhone',
    }),
    appVersion: optional(FieldType.STRING, {
      description: 'App version',
      example: '1.2.3',
    }),
    osVersion: optional(FieldType.STRING, {
      description: 'OS version',
      example: 'iOS 18.0',
    }),
  },
};

export const RemovePushTokenRequestSchema: ContractSchema = {
  name: 'RemovePushTokenRequest',
  description: 'Remove a mobile push token',
  fields: {
    token: required(FieldType.STRING, {
      description: 'Push token to remove',
      example: 'fcm-token-123',
      minLength: 1,
      maxLength: 500,
    }),
  },
};

export const ActionMessageResponseSchema: ContractSchema = {
  name: 'ActionMessageResponse',
  description: 'Simple action response',
  fields: {
    message: required(FieldType.STRING, {
      description: 'User-action result message',
      example: 'Device token registered successfully',
    }),
  },
};

export const NotificationDependencyUnavailableSchema: ContractSchema = {
  name: 'NotificationDependencyUnavailable',
  description: 'Mobile-safe error when notification storage is unavailable',
  fields: {
    success: required(FieldType.BOOLEAN, { example: false }),
    error: required(FieldType.OBJECT, {
      description: 'Stable retry metadata for mobile',
      example: {
        code: 'NOTIFICATION_DEPENDENCY_UNAVAILABLE',
        message:
          'Notifications are temporarily unavailable. Please try again later.',
        dependency: 'notification_store',
        retryable: true,
        supportReviewRequired: false,
      },
    }),
    meta: optional(FieldType.OBJECT, {
      description: 'Request metadata from the global exception filter',
      example: {
        path: '/api/v1/notifications',
        method: 'GET',
      },
    }),
  },
};

export const NotificationEndpoints: EndpointContract[] = [
  {
    method: 'GET',
    path: '/notifications',
    description: 'List notifications',
    auth: 'bearer',
    responses: {
      200: NotificationListResponseSchema,
      503: NotificationDependencyUnavailableSchema,
    },
  },
  {
    method: 'GET',
    path: '/notifications/unread-count',
    description: 'Get unread count using mobile-compatible alias',
    auth: 'bearer',
    responses: {
      200: UnreadCountResponseSchema,
      503: NotificationDependencyUnavailableSchema,
    },
  },
  {
    method: 'GET',
    path: '/notifications/preferences',
    description: 'Get current user notification preferences',
    auth: 'bearer',
    responses: {
      200: NotificationPreferencesResponseSchema,
    },
  },
  {
    method: 'PUT',
    path: '/notifications/preferences',
    description: 'Update current user notification preferences',
    auth: 'bearer',
    responses: {
      200: NotificationPreferencesResponseSchema,
    },
  },
  {
    method: 'PUT',
    path: '/notifications/:id/read',
    description: 'Mark one notification as read',
    auth: 'bearer',
    responses: {},
  },
  {
    method: 'PUT',
    path: '/notifications/read-all',
    description: 'Mark all notifications as read',
    auth: 'bearer',
    responses: {},
  },
  {
    method: 'POST',
    path: '/notifications/device-token',
    description: 'Register device token using the mobile legacy route',
    auth: 'bearer',
    requestBody: PushTokenRegistrationRequestSchema,
    responses: {
      201: ActionMessageResponseSchema,
      503: NotificationDependencyUnavailableSchema,
    },
  },
  {
    method: 'DELETE',
    path: '/notifications/device-token/:token',
    description: 'Remove device token using the mobile legacy route',
    auth: 'bearer',
    responses: { 503: NotificationDependencyUnavailableSchema },
  },
  {
    method: 'POST',
    path: '/notifications/push/token',
    description: 'Register FCM/APNS token',
    auth: 'bearer',
    requestBody: PushTokenRegistrationRequestSchema,
    responses: {
      201: ActionMessageResponseSchema,
      503: NotificationDependencyUnavailableSchema,
    },
  },
  {
    method: 'DELETE',
    path: '/notifications/push/token',
    description: 'Remove one FCM/APNS token',
    auth: 'bearer',
    requestBody: RemovePushTokenRequestSchema,
    responses: { 503: NotificationDependencyUnavailableSchema },
  },
  {
    method: 'DELETE',
    path: '/notifications/push/tokens',
    description: 'Remove all FCM/APNS tokens for the current user',
    auth: 'bearer',
    responses: { 503: NotificationDependencyUnavailableSchema },
  },
];

export const NotificationContractGroup: ContractGroup = {
  name: 'Notifications',
  basePath: '/notifications',
  description: 'Notification list, unread count, read actions, and push tokens',
  endpoints: NotificationEndpoints,
};
