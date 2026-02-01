/**
 * KYC API Contracts
 *
 * Defines the contracts for KYC verification endpoints used by the mobile app.
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
 * KYC status response
 */
export const KycStatusResponseSchema: ContractSchema = {
  name: 'KycStatusResponse',
  description: 'Current KYC verification status',
  fields: {
    status: required(FieldType.STRING, {
      description: 'KYC status',
      enum: [
        'none',
        'pending',
        'pending_verification',
        'auto_approved',
        'approved',
        'manual_review',
        'rejected',
      ],
      example: 'approved',
    }),
    score: optional(FieldType.NUMBER, {
      description: 'Verification score (0-100)',
      example: 92,
      min: 0,
      max: 100,
    }),
    submittedAt: nullable(FieldType.DATE, {
      description: 'Submission timestamp',
      example: '2026-01-25T10:00:00Z',
    }),
    approvedAt: nullable(FieldType.DATE, {
      description: 'Approval timestamp',
      example: '2026-01-25T10:01:00Z',
    }),
    rejectedAt: nullable(FieldType.DATE, {
      description: 'Rejection timestamp',
      example: null,
    }),
    canResubmit: required(FieldType.BOOLEAN, {
      description: 'Whether user can resubmit KYC',
      example: false,
    }),
    rejectionReason: optional(FieldType.STRING, {
      description: 'Reason for rejection if rejected',
      example: 'Document unclear',
    }),
  },
};

/**
 * KYC submission response
 */
export const KycSubmitResponseSchema: ContractSchema = {
  name: 'KycSubmitResponse',
  description: 'Response after KYC submission',
  fields: {
    id: required(FieldType.UUID, {
      description: 'KYC submission ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    status: required(FieldType.STRING, {
      description: 'New KYC status',
      enum: [
        'pending_verification',
        'auto_approved',
        'approved',
        'manual_review',
      ],
      example: 'pending_verification',
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable status message',
      example: 'KYC submitted successfully. Verification in progress.',
    }),
  },
};

/**
 * KYC wallet status (from wallet controller)
 */
export const WalletKycStatusResponseSchema: ContractSchema = {
  name: 'WalletKycStatusResponse',
  description: 'KYC status from wallet endpoint',
  fields: {
    walletId: required(FieldType.UUID, {
      description: 'Wallet ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    kycStatus: required(FieldType.STRING, {
      description: 'KYC status',
      enum: ['none', 'pending', 'verified', 'rejected'],
      example: 'verified',
    }),
    providerStatus: optional(FieldType.STRING, {
      description: 'Status from KYC provider',
      example: 'verified',
    }),
    verifiedAt: nullable(FieldType.DATE, {
      description: 'Verification timestamp',
      example: '2026-01-18T12:00:00.000Z',
    }),
  },
};

/**
 * Document upload response
 */
export const DocumentUploadResponseSchema: ContractSchema = {
  name: 'DocumentUploadResponse',
  description: 'Response after uploading KYC document',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether upload was successful',
      example: true,
    }),
    key: required(FieldType.STRING, {
      description: 'S3 key for the uploaded document',
      example: 'kyc/user123/id_front_abc123.jpg',
    }),
    documentType: required(FieldType.STRING, {
      description: 'Type of document uploaded',
      enum: ['id_front', 'id_back', 'selfie', 'proof_of_address'],
      example: 'id_front',
    }),
  },
};

/**
 * Upload URL response (for pre-signed URLs)
 */
export const UploadUrlResponseSchema: ContractSchema = {
  name: 'UploadUrlResponse',
  description: 'Pre-signed URL for document upload',
  fields: {
    uploadUrl: required(FieldType.STRING, {
      description: 'Pre-signed S3 upload URL',
      example: 'https://s3.amazonaws.com/bucket/key?signature=...',
    }),
    key: required(FieldType.STRING, {
      description: 'S3 key for the document',
      example: 'kyc/user123/id_front_abc123.jpg',
    }),
    expiresAt: required(FieldType.DATE, {
      description: 'URL expiry time',
      example: '2026-01-18T13:00:00.000Z',
    }),
  },
};

/**
 * KYC limits response
 */
export const KycLimitsResponseSchema: ContractSchema = {
  name: 'KycLimitsResponse',
  description: 'Transaction limits based on KYC status',
  fields: {
    tier: required(FieldType.NUMBER, {
      description: 'KYC tier (0-3)',
      example: 2,
      min: 0,
      max: 3,
    }),
    dailyLimit: required(FieldType.NUMBER, {
      description: 'Daily transaction limit',
      example: 1000,
    }),
    monthlyLimit: required(FieldType.NUMBER, {
      description: 'Monthly transaction limit',
      example: 10000,
    }),
    singleTransactionLimit: required(FieldType.NUMBER, {
      description: 'Single transaction limit',
      example: 500,
    }),
    dailyUsed: required(FieldType.NUMBER, {
      description: 'Amount used today',
      example: 150,
    }),
    monthlyUsed: required(FieldType.NUMBER, {
      description: 'Amount used this month',
      example: 2500,
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const KycSubmitRequestSchema: ContractSchema = {
  name: 'KycSubmitRequest',
  description: 'Request to submit KYC documents',
  fields: {
    firstName: required(FieldType.STRING, {
      description: 'First name',
      example: 'Amadou',
      minLength: 1,
      maxLength: 100,
    }),
    lastName: required(FieldType.STRING, {
      description: 'Last name',
      example: 'Diallo',
      minLength: 1,
      maxLength: 100,
    }),
    dateOfBirth: required(FieldType.STRING, {
      description: 'Date of birth (YYYY-MM-DD)',
      example: '1990-01-01',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    }),
    country: required(FieldType.STRING, {
      description: 'ISO country code',
      example: 'CI',
      minLength: 2,
      maxLength: 3,
    }),
    idType: required(FieldType.STRING, {
      description: 'Type of ID document',
      enum: ['passport', 'national_id', 'drivers_license'],
      example: 'national_id',
    }),
    idNumber: required(FieldType.STRING, {
      description: 'ID document number',
      example: 'ABC123456',
      minLength: 1,
      maxLength: 50,
    }),
    idExpiryDate: optional(FieldType.STRING, {
      description: 'ID expiry date (YYYY-MM-DD)',
      example: '2030-01-01',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    }),
    idFrontKey: required(FieldType.STRING, {
      description: 'S3 key for ID front image',
      example: 'kyc/user123/id_front_abc123.jpg',
    }),
    idBackKey: required(FieldType.STRING, {
      description: 'S3 key for ID back image',
      example: 'kyc/user123/id_back_abc123.jpg',
    }),
    selfieKey: required(FieldType.STRING, {
      description: 'S3 key for selfie image',
      example: 'kyc/user123/selfie_abc123.jpg',
    }),
  },
};

export const WalletKycSubmitRequestSchema: ContractSchema = {
  name: 'WalletKycSubmitRequest',
  description: 'Request to submit KYC via wallet endpoint',
  fields: {
    firstName: required(FieldType.STRING, {
      description: 'First name',
      example: 'Amadou',
    }),
    lastName: required(FieldType.STRING, {
      description: 'Last name',
      example: 'Diallo',
    }),
    dateOfBirth: required(FieldType.STRING, {
      description: 'Date of birth (YYYY-MM-DD)',
      example: '1990-01-01',
    }),
    country: required(FieldType.STRING, {
      description: 'Country code',
      example: 'CI',
    }),
    idType: required(FieldType.STRING, {
      description: 'ID type',
      enum: ['passport', 'national_id', 'drivers_license'],
    }),
    idNumber: required(FieldType.STRING, {
      description: 'ID number',
      example: 'ABC123456',
    }),
    idExpiryDate: optional(FieldType.STRING, {
      description: 'ID expiry date',
      example: '2030-01-01',
    }),
    address: optional(FieldType.STRING, {
      description: 'Physical address',
      example: 'Cocody, Abidjan',
    }),
    documentFrontKey: required(FieldType.STRING, {
      description: 'S3 key for document front',
    }),
    documentBackKey: required(FieldType.STRING, {
      description: 'S3 key for document back',
    }),
    selfieKey: required(FieldType.STRING, {
      description: 'S3 key for selfie',
    }),
  },
};

export const GetUploadUrlRequestSchema: ContractSchema = {
  name: 'GetUploadUrlRequest',
  description: 'Request for document upload URL',
  fields: {
    documentType: required(FieldType.STRING, {
      description: 'Type of document',
      enum: ['id_front', 'id_back', 'selfie', 'proof_of_address'],
      example: 'id_front',
    }),
    contentType: required(FieldType.STRING, {
      description: 'MIME type of the file',
      enum: ['image/jpeg', 'image/png', 'application/pdf'],
      example: 'image/jpeg',
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const KycErrorSchema: ContractSchema = {
  name: 'KycError',
  description: 'Error response for KYC endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 400,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'KYC already submitted',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Bad Request',
    }),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const GetKycStatusEndpoint: EndpointContract = {
  method: 'GET',
  path: '/kyc/status',
  description: 'Get KYC verification status',
  auth: 'bearer',
  responses: {
    200: KycStatusResponseSchema,
    401: KycErrorSchema,
  },
  exampleResponse: {
    200: {
      status: 'approved',
      score: 92,
      submittedAt: '2026-01-25T10:00:00Z',
      approvedAt: '2026-01-25T10:01:00Z',
      canResubmit: false,
    },
  },
};

export const SubmitKycEndpoint: EndpointContract = {
  method: 'POST',
  path: '/kyc/submit',
  description: 'Submit KYC for verification',
  auth: 'bearer',
  requestBody: KycSubmitRequestSchema,
  responses: {
    200: KycSubmitResponseSchema,
    400: KycErrorSchema,
  },
  exampleRequest: {
    firstName: 'Amadou',
    lastName: 'Diallo',
    dateOfBirth: '1990-01-01',
    country: 'CI',
    idType: 'national_id',
    idNumber: 'ABC123456',
    idFrontKey: 'kyc/user123/id_front_abc123.jpg',
    idBackKey: 'kyc/user123/id_back_abc123.jpg',
    selfieKey: 'kyc/user123/selfie_abc123.jpg',
  },
  exampleResponse: {
    200: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'pending_verification',
      message: 'KYC submitted successfully. Verification in progress.',
    },
  },
};

export const GetUploadUrlEndpoint: EndpointContract = {
  method: 'POST',
  path: '/kyc/documents/upload-url',
  description: 'Get pre-signed URL for document upload',
  auth: 'bearer',
  requestBody: GetUploadUrlRequestSchema,
  responses: {
    200: UploadUrlResponseSchema,
    400: KycErrorSchema,
  },
  exampleRequest: {
    documentType: 'id_front',
    contentType: 'image/jpeg',
  },
  exampleResponse: {
    200: {
      uploadUrl: 'https://s3.amazonaws.com/bucket/key?signature=...',
      key: 'kyc/user123/id_front_abc123.jpg',
      expiresAt: '2026-01-18T13:00:00.000Z',
    },
  },
};

// Wallet-based KYC endpoints
export const GetWalletKycStatusEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/kyc/status',
  description: 'Get KYC status via wallet endpoint',
  auth: 'bearer',
  responses: {
    200: WalletKycStatusResponseSchema,
    401: KycErrorSchema,
  },
  exampleResponse: {
    200: {
      walletId: '123e4567-e89b-12d3-a456-426614174000',
      kycStatus: 'verified',
      providerStatus: 'verified',
      verifiedAt: '2026-01-18T12:00:00.000Z',
    },
  },
};

export const SubmitWalletKycEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/kyc/submit',
  description: 'Submit KYC via wallet endpoint',
  auth: 'bearer',
  requestBody: WalletKycSubmitRequestSchema,
  responses: {
    201: {
      name: 'WalletKycSubmitResponse',
      fields: {
        walletId: required(FieldType.UUID, {
          description: 'Wallet ID',
        }),
        kycStatus: required(FieldType.STRING, {
          description: 'New KYC status',
          enum: ['pending'],
        }),
        message: required(FieldType.STRING, {
          description: 'Status message',
        }),
        submittedAt: required(FieldType.DATE, {
          description: 'Submission timestamp',
        }),
      },
    },
    400: KycErrorSchema,
  },
};

// ============================================
// Contract Group
// ============================================

export const KycContractGroup: ContractGroup = {
  name: 'KYC',
  basePath: '/kyc',
  description: 'KYC verification and document upload endpoints',
  endpoints: [
    GetKycStatusEndpoint,
    SubmitKycEndpoint,
    GetUploadUrlEndpoint,
    GetWalletKycStatusEndpoint,
    SubmitWalletKycEndpoint,
  ],
};
