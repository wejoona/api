/**
 * Device and Session API Contracts
 *
 * Covers settings screens that list/revoke trusted devices and active sessions.
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

export const DeviceSchema: ContractSchema = {
  name: 'Device',
  description: 'Registered device visible in mobile settings',
  fields: {
    id: required(FieldType.UUID, { example: '550e8400-e29b-41d4-a716-446655440321' }),
    userId: required(FieldType.UUID, { example: '550e8400-e29b-41d4-a716-446655440000' }),
    deviceIdentifier: required(FieldType.STRING, { example: 'device-123' }),
    displayName: required(FieldType.STRING, { example: 'Ben iPhone' }),
    brand: nullable(FieldType.STRING, { example: 'Apple' }),
    model: nullable(FieldType.STRING, { example: 'iPhone 17' }),
    os: nullable(FieldType.STRING, { example: 'iOS' }),
    osVersion: nullable(FieldType.STRING, { example: '18.0' }),
    appVersion: nullable(FieldType.STRING, { example: '1.2.3' }),
    platform: required(FieldType.STRING, {
      enum: ['ios', 'android', 'web', 'unknown'],
      example: 'ios',
    }),
    isTrusted: required(FieldType.BOOLEAN, { example: true }),
    trustedAt: nullable(FieldType.DATE, { example: '2026-06-04T10:30:00.000Z' }),
    isActive: required(FieldType.BOOLEAN, { example: true }),
    lastLoginAt: nullable(FieldType.DATE, { example: '2026-06-04T10:35:00.000Z' }),
    lastIpAddress: nullable(FieldType.STRING, { example: '127.0.0.1' }),
    loginCount: required(FieldType.NUMBER, { example: 3 }),
    createdAt: required(FieldType.DATE, { example: '2026-06-04T09:00:00.000Z' }),
  },
};

export const RegisterDeviceRequestSchema: ContractSchema = {
  name: 'RegisterDeviceRequest',
  description: 'Register or update current mobile device',
  fields: {
    deviceIdentifier: required(FieldType.STRING, { example: 'device-123' }),
    platform: optional(FieldType.STRING, {
      enum: ['ios', 'android', 'web', 'unknown'],
      example: 'ios',
    }),
    deviceName: optional(FieldType.STRING, { example: 'Ben iPhone' }),
    brand: optional(FieldType.STRING, { example: 'Apple' }),
    model: optional(FieldType.STRING, { example: 'iPhone 17' }),
    os: optional(FieldType.STRING, { example: 'iOS' }),
    osVersion: optional(FieldType.STRING, { example: '18.0' }),
    appVersion: optional(FieldType.STRING, { example: '1.2.3' }),
    fcmToken: optional(FieldType.STRING, { example: 'fcm-token-123' }),
    publicKeyJwk: optional(FieldType.OBJECT, {
      example: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
    }),
    metadata: optional(FieldType.OBJECT, { example: { locale: 'fr-CI' } }),
  },
};

export const DeviceActionResponseSchema: ContractSchema = {
  name: 'DeviceActionResponse',
  description: 'Device action response',
  fields: {
    success: required(FieldType.BOOLEAN, { example: true }),
    message: required(FieldType.STRING, { example: 'Device revoked successfully' }),
    count: optional(FieldType.NUMBER, { example: 1 }),
  },
};

export const SessionSchema: ContractSchema = {
  name: 'Session',
  description: 'Active session visible in mobile settings',
  fields: {
    id: required(FieldType.UUID, { example: '550e8400-e29b-41d4-a716-446655440010' }),
    userId: required(FieldType.UUID, { example: '550e8400-e29b-41d4-a716-446655440000' }),
    deviceId: nullable(FieldType.UUID, { example: '550e8400-e29b-41d4-a716-446655440321' }),
    ipAddress: nullable(FieldType.STRING, { example: '127.0.0.1' }),
    userAgent: nullable(FieldType.STRING, { example: 'Korido iOS' }),
    location: nullable(FieldType.STRING, { example: 'Abidjan, CI' }),
    isActive: required(FieldType.BOOLEAN, { example: true }),
    lastActivityAt: required(FieldType.DATE, { example: '2026-06-04T10:00:00.000Z' }),
    expiresAt: required(FieldType.DATE, { example: '2026-06-11T10:00:00.000Z' }),
    createdAt: required(FieldType.DATE, { example: '2026-06-04T09:00:00.000Z' }),
    revokedAt: optional(FieldType.DATE, { example: '2026-06-04T11:00:00.000Z' }),
    revokedReason: optional(FieldType.STRING, { example: 'user_logout_all_devices' }),
  },
};

export const RevokeSessionRequestSchema: ContractSchema = {
  name: 'RevokeSessionRequest',
  description: 'Revoke session request',
  fields: {
    reason: optional(FieldType.STRING, {
      example: 'user_revoke_device',
      maxLength: 100,
    }),
  },
};

export const SessionActionResponseSchema: ContractSchema = {
  name: 'SessionActionResponse',
  description: 'Session action response',
  fields: {
    success: required(FieldType.BOOLEAN, { example: true }),
    message: required(FieldType.STRING, { example: '3 session(s) revoked successfully' }),
    count: optional(FieldType.NUMBER, { example: 3 }),
  },
};

export const DeviceSessionEndpoints: EndpointContract[] = [
  {
    method: 'GET',
    path: '/devices',
    description: 'List active devices',
    auth: 'bearer',
    responses: { 200: { ...DeviceSchema, name: 'DeviceList', fields: { items: required(FieldType.ARRAY, { itemType: DeviceSchema }) } } },
  },
  {
    method: 'POST',
    path: '/devices/register',
    description: 'Register or update current device',
    auth: 'bearer',
    requestBody: RegisterDeviceRequestSchema,
    responses: { 201: DeviceSchema },
  },
  {
    method: 'DELETE',
    path: '/devices',
    description: 'Revoke all devices',
    auth: 'bearer',
    responses: { 200: DeviceActionResponseSchema },
  },
  {
    method: 'GET',
    path: '/sessions',
    description: 'List active sessions',
    auth: 'bearer',
    responses: { 200: { ...SessionSchema, name: 'SessionList', fields: { items: required(FieldType.ARRAY, { itemType: SessionSchema }) } } },
  },
  {
    method: 'DELETE',
    path: '/sessions/:id',
    description: 'Revoke a session',
    auth: 'bearer',
    requestBody: RevokeSessionRequestSchema,
    responses: { 200: SessionActionResponseSchema },
  },
  {
    method: 'DELETE',
    path: '/sessions',
    description: 'Revoke all sessions',
    auth: 'bearer',
    requestBody: RevokeSessionRequestSchema,
    responses: { 200: SessionActionResponseSchema },
  },
];

export const DeviceSessionContractGroup: ContractGroup = {
  name: 'Devices and Sessions',
  basePath: '/',
  description: 'Device and active-session management endpoints',
  endpoints: DeviceSessionEndpoints,
};
