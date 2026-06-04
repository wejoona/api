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
export const UserLimitsResponseSchema: ContractSchema = {
  name: 'UserLimitsResponse',
  description: 'User transaction limits',
  fields: {
    kycTier: required(FieldType.NUMBER, {
      description: 'KYC tier (0-3)',
      example: 2,
      min: 0,
      max: 3,
    }),
    limits: required(FieldType.OBJECT, {
      description: 'Transaction limits',
      nestedSchema: {
        name: 'TransactionLimits',
        fields: {
          dailyDeposit: required(FieldType.NUMBER, {
            description: 'Daily deposit limit',
            example: 1000,
          }),
          monthlyDeposit: required(FieldType.NUMBER, {
            description: 'Monthly deposit limit',
            example: 10000,
          }),
          dailyWithdrawal: required(FieldType.NUMBER, {
            description: 'Daily withdrawal limit',
            example: 500,
          }),
          monthlyWithdrawal: required(FieldType.NUMBER, {
            description: 'Monthly withdrawal limit',
            example: 5000,
          }),
          singleTransaction: required(FieldType.NUMBER, {
            description: 'Single transaction limit',
            example: 500,
          }),
        },
      },
    }),
    usage: required(FieldType.OBJECT, {
      description: 'Current usage',
      nestedSchema: {
        name: 'LimitUsage',
        fields: {
          dailyDeposit: required(FieldType.NUMBER, {
            description: 'Daily deposit used',
            example: 150,
          }),
          monthlyDeposit: required(FieldType.NUMBER, {
            description: 'Monthly deposit used',
            example: 2500,
          }),
          dailyWithdrawal: required(FieldType.NUMBER, {
            description: 'Daily withdrawal used',
            example: 0,
          }),
          monthlyWithdrawal: required(FieldType.NUMBER, {
            description: 'Monthly withdrawal used',
            example: 500,
          }),
        },
      },
    }),
    remaining: required(FieldType.OBJECT, {
      description: 'Remaining limits',
      nestedSchema: {
        name: 'RemainingLimits',
        fields: {
          dailyDeposit: required(FieldType.NUMBER, {
            description: 'Remaining daily deposit',
            example: 850,
          }),
          monthlyDeposit: required(FieldType.NUMBER, {
            description: 'Remaining monthly deposit',
            example: 7500,
          }),
          dailyWithdrawal: required(FieldType.NUMBER, {
            description: 'Remaining daily withdrawal',
            example: 500,
          }),
          monthlyWithdrawal: required(FieldType.NUMBER, {
            description: 'Remaining monthly withdrawal',
            example: 4500,
          }),
        },
      },
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
      kycTier: 2,
      limits: {
        dailyDeposit: 1000,
        monthlyDeposit: 10000,
        dailyWithdrawal: 500,
        monthlyWithdrawal: 5000,
        singleTransaction: 500,
      },
      usage: {
        dailyDeposit: 150,
        monthlyDeposit: 2500,
        dailyWithdrawal: 0,
        monthlyWithdrawal: 500,
      },
      remaining: {
        dailyDeposit: 850,
        monthlyDeposit: 7500,
        dailyWithdrawal: 500,
        monthlyWithdrawal: 4500,
      },
    },
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
  ],
};
