/**
 * Notification Contract Tests
 *
 * Validates notification API payloads consumed by mobile.
 */

import {
  ActionMessageResponseSchema,
  NotificationDependencyUnavailableSchema,
  NotificationListResponseSchema,
  NotificationPreferencesResponseSchema,
  NotificationSchema,
  PushTokenRegistrationRequestSchema,
  RemovePushTokenRequestSchema,
  UnreadCountResponseSchema,
} from '../schemas/notification.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Notification Contracts', () => {
  describe('Notification item', () => {
    it('should validate an unread transaction notification with navigation data', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'transfer_received',
        presentationType: 'transfer',
        severity: 'success',
        action: 'open_transaction',
        status: 'delivered',
        title: 'Payment received',
        body: 'You received 50.00 USDC from Ama.',
        data: { transactionId: '123e4567-e89b-12d3-a456-426614174001' },
        referenceType: 'transaction',
        referenceId: '123e4567-e89b-12d3-a456-426614174001',
        sentAt: '2026-06-04T10:30:00.000Z',
        deliveredAt: '2026-06-04T10:30:05.000Z',
        readAt: null,
        createdAt: '2026-06-04T10:30:00.000Z',
        isUnread: true,
      };

      const result = validateSchema(notification, NotificationSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a read system notification without references', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'system',
        presentationType: 'general',
        severity: 'info',
        action: 'none',
        status: 'read',
        title: 'Security update',
        body: 'Your security settings were updated.',
        data: {},
        referenceType: null,
        referenceId: null,
        sentAt: null,
        deliveredAt: null,
        readAt: '2026-06-04T11:00:00.000Z',
        createdAt: '2026-06-04T10:30:00.000Z',
        isUnread: false,
      };

      const result = validateSchema(notification, NotificationSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail when createdAt is not an ISO date', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'system',
        presentationType: 'general',
        severity: 'info',
        action: 'none',
        status: 'sent',
        title: 'Security update',
        body: 'Your security settings were updated.',
        data: {},
        referenceType: null,
        referenceId: null,
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        createdAt: 'today',
        isUnread: true,
      };

      const result = validateSchema(notification, NotificationSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'createdAt' }),
      );
    });
  });

  describe('Notification list', () => {
    it('should validate paginated notification response', () => {
      const response = {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'transfer_received',
            presentationType: 'transfer',
            severity: 'success',
            action: 'open_transaction',
            status: 'delivered',
            title: 'Payment received',
            body: 'You received 50.00 USDC from Ama.',
            data: { transactionId: '123e4567-e89b-12d3-a456-426614174001' },
            referenceType: 'transaction',
            referenceId: '123e4567-e89b-12d3-a456-426614174001',
            sentAt: '2026-06-04T10:30:00.000Z',
            deliveredAt: '2026-06-04T10:30:05.000Z',
            readAt: null,
            createdAt: '2026-06-04T10:30:00.000Z',
            isUnread: true,
          },
        ],
        total: 1,
        unreadCount: 1,
        limit: 20,
        offset: 0,
      };

      const result = validateSchema(response, NotificationListResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Unread count', () => {
    it('should validate unread count response', () => {
      const result = validateSchema({ count: 7 }, UnreadCountResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Notification preferences', () => {
    it('should validate flat and grouped mobile preferences response', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        pushEnabled: true,
        pushTransactions: true,
        pushSecurity: true,
        pushMarketing: false,
        emailEnabled: true,
        emailTransactions: true,
        emailMonthlyStatement: true,
        emailMarketing: false,
        smsEnabled: true,
        smsTransactions: true,
        smsSecurity: true,
        largeTransactionThreshold: 1000,
        lowBalanceThreshold: 100,
        channels: { push: true, email: true, sms: true, inApp: true },
        categories: {
          transaction: true,
          security: true,
          marketing: false,
          system: true,
        },
        createdAt: '2026-06-04T10:30:00.000Z',
        updatedAt: '2026-06-04T10:30:00.000Z',
      };

      const result = validateSchema(
        response,
        NotificationPreferencesResponseSchema,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Push token registration', () => {
    it('should validate mobile push token registration request', () => {
      const request = {
        token: 'fcm-token-123',
        platform: 'ios',
        deviceId: 'device-123',
        deviceName: 'Ben iPhone',
        appVersion: '1.2.3',
        osVersion: 'iOS 18.0',
      };

      const result = validateSchema(
        request,
        PushTokenRegistrationRequestSchema,
      );
      expect(result.valid).toBe(true);
    });

    it('should validate registration action response', () => {
      const result = validateSchema(
        { message: 'Device token registered successfully' },
        ActionMessageResponseSchema,
      );
      expect(result.valid).toBe(true);
    });

    it('should validate mobile push token removal request', () => {
      const result = validateSchema(
        { token: 'fcm-token-123' },
        RemovePushTokenRequestSchema,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Dependency unavailable errors', () => {
    it('should validate mobile-safe notification dependency metadata', () => {
      const response = {
        success: false,
        error: {
          code: 'NOTIFICATION_DEPENDENCY_UNAVAILABLE',
          message:
            'Notifications are temporarily unavailable. Please try again later.',
          dependency: 'notification_store',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/notifications',
          method: 'GET',
        },
      };

      const result = validateSchema(
        response,
        NotificationDependencyUnavailableSchema,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
