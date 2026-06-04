/**
 * User API Contracts
 *
 * Defines the contracts for user profile and settings endpoints used by the mobile app.
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
import { UserSchema } from './auth.contract';

// ============================================
// Response Schemas
// ============================================

/**
 * Check username availability response
 */
export const CheckUsernameResponseSchema: ContractSchema = {
  name: 'CheckUsernameResponse',
  description: 'Username availability check result',
  fields: {
    available: required(FieldType.BOOLEAN, {
      description: 'Whether username is available',
      example: true,
    }),
    username: required(FieldType.STRING, {
      description: 'Normalized username',
      example: 'amadou_diallo',
    }),
    suggestions: optional(FieldType.ARRAY, {
      description: 'Alternative username suggestions if not available',
      itemType: FieldType.STRING,
      example: ['amadou_diallo1', 'amadou_diallo_ci'],
    }),
  },
};

/**
 * Username search result item
 */
export const UsernameSearchResultSchema: ContractSchema = {
  name: 'UsernameSearchResult',
  description: 'User found in username search',
  fields: {
    id: required(FieldType.UUID, {
      description: 'User ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    username: required(FieldType.STRING, {
      description: 'Username',
      example: 'amadou_diallo',
    }),
    firstName: nullable(FieldType.STRING, {
      description: 'First name',
      example: 'Amadou',
    }),
    lastName: nullable(FieldType.STRING, {
      description: 'Last name',
      example: 'Diallo',
    }),
  },
};

/**
 * Username search response
 */
export const SearchUsernameResponseSchema: ContractSchema = {
  name: 'SearchUsernameResponse',
  description: 'Username search results',
  fields: {
    users: required(FieldType.ARRAY, {
      description: 'Matching users',
      itemType: UsernameSearchResultSchema,
    }),
    count: required(FieldType.NUMBER, {
      description: 'Number of results',
      example: 5,
    }),
  },
};

/**
 * User transaction limits response
 */
export const LimitDetailSchema: ContractSchema = {
  name: 'LimitDetail',
  description: 'Limit, usage, and remaining amount for one limit bucket',
  fields: {
    limit: required(FieldType.NUMBER, { example: 5000 }),
    used: required(FieldType.NUMBER, { example: 1250 }),
    remaining: required(FieldType.NUMBER, { example: 3750 }),
  },
};

export const UserLimitsResponseSchema: ContractSchema = {
  name: 'UserLimitsResponse',
  description:
    'User transaction limits with canonical nested shape and flat mobile aliases',
  fields: {
    tier: required(FieldType.STRING, {
      enum: ['basic', 'verified', 'premium'],
      example: 'verified',
    }),
    kycStatus: required(FieldType.STRING, {
      enum: ['none', 'pending', 'verified'],
      example: 'verified',
    }),
    daily: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'DailyLimits',
        fields: {
          send: required(FieldType.OBJECT, { nestedSchema: LimitDetailSchema }),
          withdraw: required(FieldType.OBJECT, {
            nestedSchema: LimitDetailSchema,
          }),
          deposit: required(FieldType.OBJECT, {
            nestedSchema: LimitDetailSchema,
          }),
        },
      },
    }),
    monthly: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'MonthlyLimits',
        fields: {
          total: required(FieldType.OBJECT, { nestedSchema: LimitDetailSchema }),
          international: required(FieldType.OBJECT, {
            nestedSchema: LimitDetailSchema,
          }),
        },
      },
    }),
    perTransaction: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'PerTransactionLimits',
        fields: {
          send: required(FieldType.NUMBER, { example: 2500 }),
          withdraw: required(FieldType.NUMBER, { example: 2500 }),
        },
      },
    }),
    upgradeMessage: required(FieldType.STRING, {
      example: 'Your account is verified.',
    }),
    dailyLimit: required(FieldType.NUMBER, { example: 5000 }),
    weeklyLimit: required(FieldType.NUMBER, { example: 0 }),
    monthlyLimit: required(FieldType.NUMBER, { example: 50000 }),
    singleTransactionLimit: required(FieldType.NUMBER, { example: 2500 }),
    singleTransactionMax: required(FieldType.NUMBER, { example: 2500 }),
    withdrawalLimit: required(FieldType.NUMBER, { example: 2500 }),
    dailyUsed: required(FieldType.NUMBER, { example: 1250 }),
    weeklyUsed: required(FieldType.NUMBER, { example: 0 }),
    monthlyUsed: required(FieldType.NUMBER, { example: 9000 }),
    currency: required(FieldType.STRING, { example: 'USDC' }),
    kycTier: required(FieldType.NUMBER, {
      description: 'Mobile numeric KYC tier',
      example: 2,
      min: 1,
      max: 3,
    }),
    tierName: required(FieldType.STRING, { example: 'Verified' }),
    resetTime: required(FieldType.DATE, {
      example: '2026-06-05T00:00:00.000Z',
    }),
    hoursUntilReset: required(FieldType.NUMBER, { example: 12 }),
    minutesUntilReset: required(FieldType.NUMBER, { example: 720 }),
  },
};

export const UserLimitUsageResponseSchema: ContractSchema = {
  name: 'UserLimitUsageResponse',
  description: 'Flat mobile limit usage summary',
  fields: {
    dailyUsed: required(FieldType.NUMBER, { example: 1250 }),
    weeklyUsed: required(FieldType.NUMBER, { example: 0 }),
    monthlyUsed: required(FieldType.NUMBER, { example: 9000 }),
    resetAt: required(FieldType.DATE, {
      example: '2026-06-05T00:00:00.000Z',
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const UpdateProfileRequestSchema: ContractSchema = {
  name: 'UpdateProfileRequest',
  description: 'Request to update user profile',
  fields: {
    username: optional(FieldType.STRING, {
      description: 'New username',
      example: 'amadou_diallo',
      minLength: 3,
      maxLength: 30,
      pattern: '^[a-z0-9_]+$',
    }),
    firstName: optional(FieldType.STRING, {
      description: 'First name',
      example: 'Amadou',
      maxLength: 100,
    }),
    lastName: optional(FieldType.STRING, {
      description: 'Last name',
      example: 'Diallo',
      maxLength: 100,
    }),
    email: optional(FieldType.EMAIL, {
      description: 'Email address',
      example: 'amadou@example.com',
    }),
  },
};

export const SearchUsernameQuerySchema: ContractSchema = {
  name: 'SearchUsernameQuery',
  description: 'Query for username search',
  fields: {
    query: required(FieldType.STRING, {
      description: 'Search query',
      example: 'amadou',
      minLength: 2,
    }),
    limit: optional(FieldType.NUMBER, {
      description: 'Maximum results',
      example: 10,
      min: 1,
      max: 50,
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const UserErrorSchema: ContractSchema = {
  name: 'UserError',
  description: 'Error response for user endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 409,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Username already taken',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Conflict',
    }),
  },
};

export const ProfileDependencyUnavailableSchema: ContractSchema = {
  name: 'ProfileDependencyUnavailable',
  description:
    'Mobile-safe profile dependency failure. Mobile should keep cached profile data.',
  fields: {
    success: required(FieldType.BOOLEAN, { example: false }),
    error: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'ProfileDependencyUnavailableError',
        fields: {
          code: required(FieldType.STRING, {
            example: 'PROFILE_DEPENDENCY_UNAVAILABLE',
          }),
          message: required(FieldType.STRING, {
            example:
              'Profile is temporarily unavailable. Please try again later.',
          }),
          dependency: required(FieldType.STRING, {
            example: 'user_profile_store',
          }),
          retryable: required(FieldType.BOOLEAN, { example: true }),
          supportReviewRequired: required(FieldType.BOOLEAN, {
            example: false,
          }),
        },
      },
    }),
    meta: required(FieldType.OBJECT),
  },
};

export const AvatarStorageUnavailableSchema: ContractSchema = {
  name: 'AvatarStorageUnavailable',
  description:
    'Mobile-safe avatar storage failure. Mobile should keep cached avatar data.',
  fields: {
    success: required(FieldType.BOOLEAN, { example: false }),
    error: required(FieldType.OBJECT, {
      nestedSchema: {
        name: 'AvatarStorageUnavailableError',
        fields: {
          code: required(FieldType.STRING, {
            example: 'AVATAR_STORAGE_UNAVAILABLE',
          }),
          message: required(FieldType.STRING, {
            example:
              'Profile photo storage is temporarily unavailable. Please try again later.',
          }),
          dependency: required(FieldType.STRING, {
            example: 'avatar_storage',
          }),
          retryable: required(FieldType.BOOLEAN, { example: true }),
          supportReviewRequired: required(FieldType.BOOLEAN, {
            example: false,
          }),
        },
      },
    }),
    meta: required(FieldType.OBJECT),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const GetProfileEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/profile',
  description: 'Get current user profile',
  auth: 'bearer',
  responses: {
    200: UserSchema,
    401: UserErrorSchema,
    503: ProfileDependencyUnavailableSchema,
  },
  exampleResponse: {
    200: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      phone: '+2250701234567',
      phoneVerified: true,
      username: 'amadou_diallo',
      firstName: 'Amadou',
      lastName: 'Diallo',
      email: 'amadou@example.com',
      avatarUrl: null,
      avatarThumb: null,
      preferredLocale: 'fr',
      countryCode: 'CI',
      kycStatus: 'approved',
      kycRejectionReason: null,
      canTransact: true,
      canWithdraw: true,
      hasPin: true,
      createdAt: '2026-01-18T12:00:00.000Z',
    },
  },
};

export const UpdateProfileEndpoint: EndpointContract = {
  method: 'PUT',
  path: '/user/profile',
  description: 'Update user profile',
  auth: 'bearer',
  requestBody: UpdateProfileRequestSchema,
  responses: {
    200: UserSchema,
    400: UserErrorSchema,
    409: UserErrorSchema,
    503: ProfileDependencyUnavailableSchema,
  },
  exampleRequest: {
    username: 'amadou_diallo',
    firstName: 'Amadou',
    lastName: 'Diallo',
  },
};

export const UploadAvatarEndpoint: EndpointContract = {
  method: 'POST',
  path: '/user/avatar',
  description: 'Upload current user avatar image',
  auth: 'bearer',
  responses: {
    200: {
      name: 'UploadAvatarResponse',
      fields: {
        avatarUrl: required(FieldType.STRING, {
          example: '/user/avatar/123e4567-e89b-12d3-a456-426614174000',
        }),
        avatarThumb: nullable(FieldType.STRING, {
          example: 'data:image/jpeg;base64,abc123',
        }),
        message: required(FieldType.STRING, {
          example: 'Avatar uploaded successfully',
        }),
      },
    },
    503: AvatarStorageUnavailableSchema,
  },
};

export const DeleteAvatarEndpoint: EndpointContract = {
  method: 'DELETE',
  path: '/user/avatar',
  description: 'Remove current user avatar reference',
  auth: 'bearer',
  responses: {
    200: {
      name: 'DeleteAvatarResponse',
      fields: {
        message: required(FieldType.STRING, {
          example: 'Avatar removed successfully',
        }),
      },
    },
    503: ProfileDependencyUnavailableSchema,
  },
};

export const CheckUsernameEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/username/check/:username',
  description: 'Check if username is available',
  auth: 'bearer',
  pathParams: {
    username: required(FieldType.STRING, {
      description: 'Username to check',
      example: 'amadou_diallo',
    }),
  },
  responses: {
    200: CheckUsernameResponseSchema,
  },
  exampleResponse: {
    200: {
      available: true,
      username: 'amadou_diallo',
    },
  },
};

export const SearchUsernameEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/username/search',
  description: 'Search users by username',
  auth: 'bearer',
  queryParams: SearchUsernameQuerySchema,
  responses: {
    200: SearchUsernameResponseSchema,
  },
  exampleResponse: {
    200: {
      users: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'amadou_diallo',
          firstName: 'Amadou',
          lastName: 'Diallo',
        },
      ],
      count: 1,
    },
  },
};

export const FindByUsernameEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/by-username/:username',
  description: 'Find user by username',
  auth: 'bearer',
  pathParams: {
    username: required(FieldType.STRING, {
      description: 'Username (with or without @)',
      example: 'amadou_diallo',
    }),
  },
  responses: {
    200: UserSchema,
    404: UserErrorSchema,
  },
};

export const GetUserLimitsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/limits',
  description: 'Get user transaction limits',
  auth: 'bearer',
  responses: {
    200: UserLimitsResponseSchema,
    404: UserErrorSchema,
  },
  exampleResponse: {
    200: {
      tier: 'verified',
      kycStatus: 'verified',
      daily: {
        send: { limit: 5000, used: 1250, remaining: 3750 },
        withdraw: { limit: 2500, used: 100, remaining: 2400 },
        deposit: { limit: 20000, used: 5000, remaining: 15000 },
      },
      monthly: {
        total: { limit: 50000, used: 9000, remaining: 41000 },
        international: { limit: 10000, used: 0, remaining: 10000 },
      },
      perTransaction: {
        send: 2500,
        withdraw: 2500,
      },
      upgradeMessage: 'Your account is verified.',
      dailyLimit: 5000,
      weeklyLimit: 0,
      monthlyLimit: 50000,
      singleTransactionLimit: 2500,
      singleTransactionMax: 2500,
      withdrawalLimit: 2500,
      dailyUsed: 1250,
      weeklyUsed: 0,
      monthlyUsed: 9000,
      currency: 'USDC',
      kycTier: 2,
      tierName: 'Verified',
      resetTime: '2026-06-05T00:00:00.000Z',
      hoursUntilReset: 12,
      minutesUntilReset: 720,
    },
  },
};

export const GetUserLimitUsageEndpoint: EndpointContract = {
  method: 'GET',
  path: '/user/limits/usage',
  description: 'Get user transaction limit usage summary',
  auth: 'bearer',
  responses: {
    200: UserLimitUsageResponseSchema,
    404: UserErrorSchema,
  },
};

// ============================================
// Contract Group
// ============================================

export const UserContractGroup: ContractGroup = {
  name: 'User',
  basePath: '/user',
  description: 'User profile and settings endpoints',
  endpoints: [
    GetProfileEndpoint,
    UpdateProfileEndpoint,
    UploadAvatarEndpoint,
    DeleteAvatarEndpoint,
    CheckUsernameEndpoint,
    SearchUsernameEndpoint,
    FindByUsernameEndpoint,
    GetUserLimitsEndpoint,
    GetUserLimitUsageEndpoint,
  ],
};
