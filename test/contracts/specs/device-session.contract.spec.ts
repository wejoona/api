/**
 * Device and Session Contract Tests
 */

import {
  DeviceActionResponseSchema,
  DeviceSchema,
  RegisterDeviceRequestSchema,
  RevokeSessionRequestSchema,
  SessionActionResponseSchema,
  SessionListResponseSchema,
  SessionSchema,
} from '../schemas/device-session.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Device and Session Contracts', () => {
  it('should validate mobile-compatible device response', () => {
    const device = {
      id: '550e8400-e29b-41d4-a716-446655440321',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      deviceIdentifier: 'device-123',
      displayName: 'Ben iPhone',
      brand: 'Apple',
      model: 'iPhone 17',
      os: 'iOS',
      osVersion: '18.0',
      appVersion: '1.2.3',
      platform: 'ios',
      isTrusted: false,
      trustedAt: null,
      isActive: true,
      lastLoginAt: null,
      lastIpAddress: '127.0.0.1',
      loginCount: 1,
      createdAt: '2026-06-04T09:00:00.000Z',
    };

    const result = validateSchema(device, DeviceSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate mobile device registration request', () => {
    const request = {
      deviceIdentifier: 'device-123',
      platform: 'ios',
      deviceName: 'Ben iPhone',
      brand: 'Apple',
      model: 'iPhone 17',
      os: 'iOS',
      osVersion: '18.0',
      appVersion: '1.2.3',
      fcmToken: 'fcm-token-123',
      metadata: { locale: 'fr-CI' },
    };

    const result = validateSchema(request, RegisterDeviceRequestSchema);
    expect(result.valid).toBe(true);
  });

  it('should validate device action response', () => {
    const result = validateSchema(
      { success: true, message: '1 device(s) revoked successfully', count: 1 },
      DeviceActionResponseSchema,
    );
    expect(result.valid).toBe(true);
  });

  it('should validate mobile-compatible session response', () => {
    const session = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440321',
      ipAddress: '127.0.0.1',
      userAgent: 'Korido iOS',
      location: null,
      isActive: true,
      lastActivityAt: '2026-06-04T10:00:00.000Z',
      expiresAt: '2026-06-11T10:00:00.000Z',
      createdAt: '2026-06-04T09:00:00.000Z',
    };

    const result = validateSchema(session, SessionSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate mobile-compatible session list response', () => {
    const session = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440321',
      ipAddress: '127.0.0.1',
      userAgent: 'Korido iOS',
      location: null,
      isActive: true,
      lastActivityAt: '2026-06-04T10:00:00.000Z',
      expiresAt: '2026-06-11T10:00:00.000Z',
      createdAt: '2026-06-04T09:00:00.000Z',
    };

    const result = validateSchema(
      {
        sessions: [session],
        items: [session],
        total: 1,
      },
      SessionListResponseSchema,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate session revoke request and response', () => {
    expect(
      validateSchema(
        { reason: 'user_revoke_device' },
        RevokeSessionRequestSchema,
      ).valid,
    ).toBe(true);

    expect(
      validateSchema(
        {
          success: true,
          message: '3 session(s) revoked successfully',
          count: 3,
        },
        SessionActionResponseSchema,
      ).valid,
    ).toBe(true);
  });
});
