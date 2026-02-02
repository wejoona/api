/**
 * Authentication API Contracts
 *
 * Defines the contracts for all authentication endpoints used by the mobile app.
 */

import {
  ContractSchema,
  EndpointContract,
  ContractGroup,
  FieldType,
  required,
  optional,
  nullable,
} from './types';

// ============================================
// Response Schemas
// ============================================

/**
 * User response - embedded in auth responses
 */
export const UserSchema: ContractSchema = {
  name: 'UserResponse',
  description: 'User profile information',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Unique user identifier',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    phone: required(FieldType.PHONE, {
      description: 'User phone number in E.164 format',
      example: '+2250701234567',
    }),
    phoneVerified: required(FieldType.BOOLEAN, {
      description: 'Whether phone number is verified',
      example: true,
    }),
    username: nullable(FieldType.STRING, {
      description: 'Optional username for the user',
      example: 'amadou_diallo',
    }),
    firstName: nullable(FieldType.STRING, {
      description: 'User first name',
      example: 'Amadou',
    }),
    lastName: nullable(FieldType.STRING, {
      description: 'User last name',
      example: 'Diallo',
    }),
    email: nullable(FieldType.EMAIL, {
      description: 'User email address',
      example: 'amadou@example.com',
    }),
    countryCode: required(FieldType.STRING, {
      description: 'ISO country code',
      example: 'CI',
      minLength: 2,
      maxLength: 3,
    }),
    kycStatus: required(FieldType.STRING, {
      description: 'KYC verification status',
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      example: 'approved',
    }),
    canTransact: required(FieldType.BOOLEAN, {
      description: 'Whether user can make transactions',
      example: true,
    }),
    canWithdraw: required(FieldType.BOOLEAN, {
      description: 'Whether user can make withdrawals',
      example: true,
    }),
    createdAt: required(FieldType.DATE, {
      description: 'Account creation timestamp',
      example: '2026-01-18T12:00:00.000Z',
    }),
  },
};

/**
 * OTP sent response
 */
export const OtpSentResponseSchema: ContractSchema = {
  name: 'OtpSentResponse',
  description: 'Response when OTP is sent for registration or login',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether OTP was sent successfully',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable message',
      example: 'OTP sent successfully',
    }),
    expiresIn: required(FieldType.NUMBER, {
      description: 'OTP expiry in seconds',
      example: 300,
      min: 60,
      max: 600,
    }),
  },
};

/**
 * Auth response (after OTP verification)
 *
 * CRITICAL: expiresIn must be present and accurate.
 * Mobile uses this to schedule token refresh. If this is wrong,
 * users get logged out during long operations (e.g., KYC upload).
 */
export const AuthResponseSchema: ContractSchema = {
  name: 'AuthResponse',
  description: 'Response after successful OTP verification',
  fields: {
    accessToken: required(FieldType.STRING, {
      description: 'JWT access token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    refreshToken: required(FieldType.STRING, {
      description: 'JWT refresh token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresIn: required(FieldType.NUMBER, {
      description: 'Access token expiry in seconds. CRITICAL: Mobile uses this to schedule refresh.',
      example: 900,
      min: 300, // At least 5 minutes
      max: 3600, // At most 1 hour
    }),
    user: required(FieldType.OBJECT, {
      description: 'User profile',
      nestedSchema: UserSchema,
    }),
    kycStatus: optional(FieldType.STRING, {
      description: 'Current KYC status',
      enum: [
        'pending',
        'submitted',
        'documents_pending',
        'approved',
        'rejected',
      ],
      example: 'approved',
    }),
  },
};

/**
 * Refresh token response
 *
 * CRITICAL: expiresIn must be present and accurate.
 * Mobile uses this to reschedule the next token refresh.
 */
export const RefreshResponseSchema: ContractSchema = {
  name: 'RefreshResponse',
  description: 'Response when refreshing access token',
  fields: {
    accessToken: required(FieldType.STRING, {
      description: 'New JWT access token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    refreshToken: required(FieldType.STRING, {
      description: 'New JWT refresh token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresIn: required(FieldType.NUMBER, {
      description: 'Access token expiry in seconds. CRITICAL: Mobile uses this to schedule next refresh.',
      example: 900,
      min: 300, // At least 5 minutes
      max: 3600, // At most 1 hour
    }),
  },
};

/**
 * Logout response
 */
export const LogoutResponseSchema: ContractSchema = {
  name: 'LogoutResponse',
  description: 'Response after logout',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether logout was successful',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable message',
      example: 'Logged out successfully',
    }),
  },
};

/**
 * Logout all response
 */
export const LogoutAllResponseSchema: ContractSchema = {
  name: 'LogoutAllResponse',
  description: 'Response after logging out from all devices',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether logout was successful',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable message',
      example: 'All devices logged out successfully',
    }),
    sessionsInvalidated: optional(FieldType.NUMBER, {
      description: 'Number of sessions that were invalidated',
      example: 5,
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const RegisterRequestSchema: ContractSchema = {
  name: 'RegisterRequest',
  description: 'Request to register a new user',
  fields: {
    phone: required(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
    countryCode: required(FieldType.STRING, {
      description: 'ISO country code',
      example: 'CI',
      minLength: 2,
      maxLength: 3,
    }),
  },
};

export const VerifyOtpRequestSchema: ContractSchema = {
  name: 'VerifyOtpRequest',
  description: 'Request to verify OTP',
  fields: {
    phone: required(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
    otp: required(FieldType.STRING, {
      description: '6-digit OTP code',
      example: '123456',
      minLength: 6,
      maxLength: 6,
    }),
  },
};

export const LoginRequestSchema: ContractSchema = {
  name: 'LoginRequest',
  description: 'Request to login (request OTP)',
  fields: {
    phone: required(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
  },
};

export const RefreshTokenRequestSchema: ContractSchema = {
  name: 'RefreshTokenRequest',
  description: 'Request to refresh access token',
  fields: {
    refreshToken: required(FieldType.STRING, {
      description: 'Current refresh token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
  },
};

export const LogoutRequestSchema: ContractSchema = {
  name: 'LogoutRequest',
  description: 'Request to logout',
  fields: {
    refreshToken: required(FieldType.STRING, {
      description: 'Refresh token to invalidate',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const AuthErrorSchema: ContractSchema = {
  name: 'AuthError',
  description: 'Error response for authentication endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 401,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Invalid or expired refresh token',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Unauthorized',
    }),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const RegisterEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/register',
  description: 'Register a new user account',
  auth: 'none',
  requestBody: RegisterRequestSchema,
  responses: {
    201: OtpSentResponseSchema,
    400: AuthErrorSchema,
    429: AuthErrorSchema,
  },
  exampleRequest: {
    phone: '+2250701234567',
    countryCode: 'CI',
  },
  exampleResponse: {
    201: {
      success: true,
      message: 'OTP sent successfully. Please verify your phone number.',
      expiresIn: 300,
    },
  },
};

export const VerifyOtpEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/verify-otp',
  description: 'Verify OTP and get access tokens',
  auth: 'none',
  requestBody: VerifyOtpRequestSchema,
  responses: {
    200: AuthResponseSchema,
    400: AuthErrorSchema,
    429: AuthErrorSchema,
  },
  exampleRequest: {
    phone: '+2250701234567',
    otp: '123456',
  },
  exampleResponse: {
    200: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900, // CRITICAL: Mobile uses this to schedule token refresh
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone: '+2250701234567',
        phoneVerified: true,
        username: null,
        firstName: null,
        lastName: null,
        email: null,
        countryCode: 'CI',
        kycStatus: 'pending',
        canTransact: false,
        canWithdraw: false,
        createdAt: '2026-01-18T12:00:00.000Z',
      },
      kycStatus: 'pending',
    },
  },
};

export const LoginEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/login',
  description: 'Request login OTP',
  auth: 'none',
  requestBody: LoginRequestSchema,
  responses: {
    200: OtpSentResponseSchema,
    400: AuthErrorSchema,
    429: AuthErrorSchema,
  },
  exampleRequest: {
    phone: '+2250701234567',
  },
  exampleResponse: {
    200: {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300,
    },
  },
};

export const RefreshEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/refresh',
  description: 'Refresh access token',
  auth: 'none',
  requestBody: RefreshTokenRequestSchema,
  responses: {
    200: RefreshResponseSchema,
    401: AuthErrorSchema,
  },
  exampleRequest: {
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  exampleResponse: {
    200: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    },
  },
};

export const LogoutEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/logout',
  description: 'Logout and invalidate refresh token',
  auth: 'bearer',
  requestBody: LogoutRequestSchema,
  responses: {
    200: LogoutResponseSchema,
    401: AuthErrorSchema,
  },
  exampleRequest: {
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  exampleResponse: {
    200: {
      success: true,
      message: 'Logged out successfully',
    },
  },
};

export const LogoutAllEndpoint: EndpointContract = {
  method: 'POST',
  path: '/auth/logout-all',
  description: 'Logout from all devices',
  auth: 'bearer',
  requestBody: {
    name: 'LogoutAllRequest',
    fields: {
      currentRefreshToken: optional(FieldType.STRING, {
        description: 'Keep current session if provided',
      }),
    },
  },
  responses: {
    200: LogoutAllResponseSchema,
    401: AuthErrorSchema,
  },
  exampleResponse: {
    200: {
      success: true,
      message: 'All devices logged out successfully',
      sessionsInvalidated: 5,
    },
  },
};

// ============================================
// Contract Group
// ============================================

export const AuthContractGroup: ContractGroup = {
  name: 'Authentication',
  basePath: '/auth',
  description: 'Authentication and session management endpoints',
  endpoints: [
    RegisterEndpoint,
    VerifyOtpEndpoint,
    LoginEndpoint,
    RefreshEndpoint,
    LogoutEndpoint,
    LogoutAllEndpoint,
  ],
};
