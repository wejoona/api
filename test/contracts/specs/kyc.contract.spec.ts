/**
 * KYC Contract Tests
 *
 * Validates that KYC API responses match mobile app expectations.
 */

import {
  KycStatusResponseSchema,
  KycSubmitResponseSchema,
  WalletKycStatusResponseSchema,
  DocumentUploadResponseSchema,
  UploadUrlResponseSchema,
  KycLimitsResponseSchema,
} from '../schemas/kyc.contract';
import { validateSchema } from '../validators/schema-validator';

describe('KYC Contracts', () => {
  describe('GET /kyc/status - KYC Status Response', () => {
    it('should validate approved KYC status', () => {
      const response = {
        status: 'approved',
        score: 92,
        submittedAt: '2026-01-25T10:00:00.000Z',
        approvedAt: '2026-01-25T10:01:00.000Z',
        rejectedAt: null,
        canResubmit: false,
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate pending KYC status', () => {
      const response = {
        status: 'pending_verification',
        score: 75,
        submittedAt: '2026-01-25T10:00:00.000Z',
        approvedAt: null,
        rejectedAt: null,
        canResubmit: false,
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate rejected KYC status with reason', () => {
      const response = {
        status: 'rejected',
        score: 45,
        submittedAt: '2026-01-25T10:00:00.000Z',
        approvedAt: null,
        rejectedAt: '2026-01-25T10:30:00.000Z',
        canResubmit: true,
        rejectionReason: 'Document unclear - ID photo is blurry',
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate new user with no KYC', () => {
      const response = {
        status: 'none',
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        canResubmit: true,
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate manual review status', () => {
      const response = {
        status: 'manual_review',
        score: 60,
        submittedAt: '2026-01-25T10:00:00.000Z',
        approvedAt: null,
        rejectedAt: null,
        canResubmit: false,
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if status is invalid', () => {
      const response = {
        status: 'invalid_status',
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        canResubmit: true,
      };

      const result = validateSchema(response, KycStatusResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /kyc/submit - KYC Submit Response', () => {
    it('should validate successful KYC submission', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending_verification',
        message: 'KYC submitted successfully. Verification in progress.',
      };

      const result = validateSchema(response, KycSubmitResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate auto-approved submission', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'auto_approved',
        message: 'KYC verified successfully. Your wallet is being created.',
      };

      const result = validateSchema(response, KycSubmitResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate manual review submission', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'manual_review',
        message: 'KYC submitted. Additional review required.',
      };

      const result = validateSchema(response, KycSubmitResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if id is not a UUID', () => {
      const response = {
        id: 'not-a-uuid',
        status: 'pending_verification',
        message: 'KYC submitted successfully.',
      };

      const result = validateSchema(response, KycSubmitResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /wallet/kyc/status - Wallet KYC Status Response', () => {
    it('should validate verified wallet KYC status', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        kycStatus: 'verified',
        providerStatus: 'verified',
        verifiedAt: '2026-01-18T12:00:00.000Z',
      };

      const result = validateSchema(response, WalletKycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate pending wallet KYC status', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        kycStatus: 'pending',
        verifiedAt: null,
      };

      const result = validateSchema(response, WalletKycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow providerStatus to be optional', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        kycStatus: 'none',
        verifiedAt: null,
      };

      const result = validateSchema(response, WalletKycStatusResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Document Upload Response', () => {
    it('should validate successful document upload', () => {
      const response = {
        success: true,
        key: 'kyc/user123/id_front_abc123.jpg',
        documentType: 'id_front',
      };

      const result = validateSchema(response, DocumentUploadResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate all document types', () => {
      const documentTypes = [
        'id_front',
        'id_back',
        'selfie',
        'proof_of_address',
      ];

      for (const docType of documentTypes) {
        const response = {
          success: true,
          key: `kyc/user123/${docType}_abc123.jpg`,
          documentType: docType,
        };

        const result = validateSchema(response, DocumentUploadResponseSchema);
        expect(result.valid).toBe(true);
      }
    });

    it('should fail if documentType is invalid', () => {
      const response = {
        success: true,
        key: 'kyc/user123/doc_abc123.jpg',
        documentType: 'invalid_type',
      };

      const result = validateSchema(response, DocumentUploadResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Upload URL Response', () => {
    it('should validate pre-signed URL response', () => {
      const response = {
        uploadUrl:
          'https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
        key: 'kyc/user123/id_front_abc123.jpg',
        expiresAt: '2026-01-18T13:00:00.000Z',
      };

      const result = validateSchema(response, UploadUrlResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if expiresAt is not ISO date', () => {
      const response = {
        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
        key: 'kyc/user123/id_front_abc123.jpg',
        expiresAt: '2026-01-18', // Not ISO
      };

      const result = validateSchema(response, UploadUrlResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('KYC Limits Response', () => {
    it('should validate complete limits response', () => {
      const response = {
        tier: 2,
        dailyLimit: 1000,
        monthlyLimit: 10000,
        singleTransactionLimit: 500,
        dailyUsed: 150,
        monthlyUsed: 2500,
      };

      const result = validateSchema(response, KycLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate tier 0 (no KYC)', () => {
      const response = {
        tier: 0,
        dailyLimit: 100,
        monthlyLimit: 500,
        singleTransactionLimit: 50,
        dailyUsed: 0,
        monthlyUsed: 0,
      };

      const result = validateSchema(response, KycLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate tier 3 (maximum)', () => {
      const response = {
        tier: 3,
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        singleTransactionLimit: 50000,
        dailyUsed: 5000,
        monthlyUsed: 100000,
      };

      const result = validateSchema(response, KycLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if tier is out of range', () => {
      const response = {
        tier: 5, // Invalid
        dailyLimit: 1000,
        monthlyLimit: 10000,
        singleTransactionLimit: 500,
        dailyUsed: 0,
        monthlyUsed: 0,
      };

      const result = validateSchema(response, KycLimitsResponseSchema);
      expect(result.valid).toBe(false);
    });
  });
});
