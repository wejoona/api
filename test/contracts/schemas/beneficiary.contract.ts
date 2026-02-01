/**
 * Beneficiary API Contracts
 *
 * Defines the contracts for beneficiary management endpoints used by the mobile app.
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
 * Single beneficiary
 */
export const BeneficiarySchema: ContractSchema = {
  name: 'Beneficiary',
  description: 'Beneficiary details',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Beneficiary ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    walletId: required(FieldType.UUID, {
      description: 'Owner wallet ID',
      example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    name: required(FieldType.STRING, {
      description: 'Beneficiary name',
      example: 'Amadou Diallo',
    }),
    phoneE164: nullable(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
    accountType: required(FieldType.STRING, {
      description: 'Type of beneficiary account',
      enum: ['internal', 'external_wallet', 'bank_account', 'mobile_money'],
      example: 'internal',
    }),
    beneficiaryUserId: nullable(FieldType.UUID, {
      description: 'User ID if internal beneficiary',
      example: '123e4567-e89b-12d3-a456-426614174002',
    }),
    beneficiaryWalletAddress: nullable(FieldType.STRING, {
      description: 'Wallet address for external transfers',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    bankCode: nullable(FieldType.STRING, {
      description: 'Bank code for bank transfers',
      example: 'ECOBANK_CI',
    }),
    bankAccountNumber: nullable(FieldType.STRING, {
      description: 'Bank account number',
      example: '1234567890',
    }),
    mobileMoneyProvider: nullable(FieldType.STRING, {
      description: 'Mobile money provider',
      enum: ['orange_money', 'mtn_momo', 'wave', 'moov'],
      example: 'orange_money',
    }),
    isFavorite: required(FieldType.BOOLEAN, {
      description: 'Whether beneficiary is favorite',
      example: true,
    }),
    isVerified: required(FieldType.BOOLEAN, {
      description: 'Whether beneficiary is verified',
      example: true,
    }),
    transferCount: required(FieldType.NUMBER, {
      description: 'Number of transfers to this beneficiary',
      example: 10,
    }),
    totalTransferred: required(FieldType.NUMBER, {
      description: 'Total amount transferred',
      example: 500.0,
    }),
    lastTransferAt: nullable(FieldType.DATE, {
      description: 'Last transfer timestamp',
      example: '2026-01-20T12:00:00.000Z',
    }),
    createdAt: required(FieldType.DATE, {
      description: 'Creation timestamp',
      example: '2026-01-01T12:00:00.000Z',
    }),
  },
};

/**
 * Beneficiary list response (array format)
 */
export const BeneficiaryListResponseSchema: ContractSchema = {
  name: 'BeneficiaryListResponse',
  description: 'Array of beneficiaries',
  fields: {},
  // This is an array response, handled differently
};

/**
 * Toggle favorite response
 */
export const ToggleFavoriteResponseSchema: ContractSchema = {
  name: 'ToggleFavoriteResponse',
  description: 'Response after toggling favorite',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether operation succeeded',
      example: true,
    }),
    isFavorite: required(FieldType.BOOLEAN, {
      description: 'New favorite status',
      example: true,
    }),
  },
};

/**
 * Success response for update/delete
 */
export const BeneficiarySuccessResponseSchema: ContractSchema = {
  name: 'BeneficiarySuccessResponse',
  description: 'Generic success response',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether operation succeeded',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Success message',
      example: 'Beneficiary updated successfully',
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const CreateBeneficiaryRequestSchema: ContractSchema = {
  name: 'CreateBeneficiaryRequest',
  description: 'Request to create a beneficiary',
  fields: {
    name: required(FieldType.STRING, {
      description: 'Beneficiary name',
      example: 'Amadou Diallo',
      minLength: 1,
      maxLength: 100,
    }),
    accountType: required(FieldType.STRING, {
      description: 'Type of beneficiary account',
      enum: ['internal', 'external_wallet', 'bank_account', 'mobile_money'],
      example: 'internal',
    }),
    phoneE164: optional(FieldType.PHONE, {
      description: 'Phone number (required for internal/mobile_money)',
      example: '+2250701234567',
    }),
    beneficiaryWalletAddress: optional(FieldType.STRING, {
      description: 'Wallet address (required for external_wallet)',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    bankCode: optional(FieldType.STRING, {
      description: 'Bank code (required for bank_account)',
      example: 'ECOBANK_CI',
    }),
    bankAccountNumber: optional(FieldType.STRING, {
      description: 'Bank account (required for bank_account)',
      example: '1234567890',
    }),
    mobileMoneyProvider: optional(FieldType.STRING, {
      description: 'Provider (required for mobile_money)',
      enum: ['orange_money', 'mtn_momo', 'wave', 'moov'],
      example: 'orange_money',
    }),
  },
};

export const UpdateBeneficiaryRequestSchema: ContractSchema = {
  name: 'UpdateBeneficiaryRequest',
  description: 'Request to update a beneficiary',
  fields: {
    name: optional(FieldType.STRING, {
      description: 'New name',
      example: 'Amadou Diallo',
    }),
    isFavorite: optional(FieldType.BOOLEAN, {
      description: 'Favorite status',
      example: true,
    }),
  },
};

export const GetBeneficiariesQuerySchema: ContractSchema = {
  name: 'GetBeneficiariesQuery',
  description: 'Query parameters for beneficiary list',
  fields: {
    type: optional(FieldType.STRING, {
      description: 'Filter by account type',
      enum: ['internal', 'external_wallet', 'bank_account', 'mobile_money'],
    }),
    favorites: optional(FieldType.STRING, {
      description: 'Get favorites only (true/false)',
      example: 'true',
    }),
    recent: optional(FieldType.STRING, {
      description: 'Get recent only (true/false)',
      example: 'true',
    }),
    limit: optional(FieldType.STRING, {
      description: 'Limit for recent query',
      example: '10',
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const BeneficiaryErrorSchema: ContractSchema = {
  name: 'BeneficiaryError',
  description: 'Error response for beneficiary endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 404,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Beneficiary not found',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Not Found',
    }),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const GetBeneficiariesEndpoint: EndpointContract = {
  method: 'GET',
  path: '/beneficiaries',
  description: 'Get all beneficiaries with optional filters',
  auth: 'bearer',
  queryParams: GetBeneficiariesQuerySchema,
  responses: {
    200: {
      name: 'BeneficiaryArray',
      description: 'Array of beneficiaries',
      fields: {},
    },
    401: BeneficiaryErrorSchema,
  },
  exampleResponse: {
    200: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Amadou Diallo',
        phoneE164: '+2250701234567',
        accountType: 'internal',
        beneficiaryUserId: '123e4567-e89b-12d3-a456-426614174002',
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: null,
        isFavorite: true,
        isVerified: true,
        transferCount: 10,
        totalTransferred: 500.0,
        lastTransferAt: '2026-01-20T12:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z',
      },
    ],
  },
};

export const GetBeneficiaryEndpoint: EndpointContract = {
  method: 'GET',
  path: '/beneficiaries/:id',
  description: 'Get single beneficiary',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Beneficiary ID',
    }),
  },
  responses: {
    200: BeneficiarySchema,
    404: BeneficiaryErrorSchema,
  },
};

export const CreateBeneficiaryEndpoint: EndpointContract = {
  method: 'POST',
  path: '/beneficiaries',
  description: 'Create a new beneficiary',
  auth: 'bearer',
  requestBody: CreateBeneficiaryRequestSchema,
  responses: {
    201: BeneficiarySchema,
    400: BeneficiaryErrorSchema,
  },
  exampleRequest: {
    name: 'Amadou Diallo',
    accountType: 'internal',
    phoneE164: '+2250701234567',
  },
};

export const UpdateBeneficiaryEndpoint: EndpointContract = {
  method: 'PUT',
  path: '/beneficiaries/:id',
  description: 'Update a beneficiary',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Beneficiary ID',
    }),
  },
  requestBody: UpdateBeneficiaryRequestSchema,
  responses: {
    200: BeneficiarySuccessResponseSchema,
    404: BeneficiaryErrorSchema,
  },
};

export const ToggleBeneficiaryFavoriteEndpoint: EndpointContract = {
  method: 'POST',
  path: '/beneficiaries/:id/favorite',
  description: 'Toggle beneficiary favorite status',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Beneficiary ID',
    }),
  },
  responses: {
    200: ToggleFavoriteResponseSchema,
    404: BeneficiaryErrorSchema,
  },
};

export const DeleteBeneficiaryEndpoint: EndpointContract = {
  method: 'DELETE',
  path: '/beneficiaries/:id',
  description: 'Delete a beneficiary',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Beneficiary ID',
    }),
  },
  responses: {
    200: BeneficiarySuccessResponseSchema,
    404: BeneficiaryErrorSchema,
  },
};

// ============================================
// Contract Group
// ============================================

export const BeneficiaryContractGroup: ContractGroup = {
  name: 'Beneficiaries',
  basePath: '/beneficiaries',
  description: 'Beneficiary management endpoints',
  endpoints: [
    GetBeneficiariesEndpoint,
    GetBeneficiaryEndpoint,
    CreateBeneficiaryEndpoint,
    UpdateBeneficiaryEndpoint,
    ToggleBeneficiaryFavoriteEndpoint,
    DeleteBeneficiaryEndpoint,
  ],
};
