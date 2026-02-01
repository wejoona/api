/**
 * Beneficiary Contract Tests
 *
 * Validates that beneficiary API responses match mobile app expectations.
 */

import {
  BeneficiarySchema,
  ToggleFavoriteResponseSchema,
  BeneficiarySuccessResponseSchema,
} from '../schemas/beneficiary.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Beneficiary Contracts', () => {
  describe('Beneficiary Schema', () => {
    it('should validate internal beneficiary', () => {
      const beneficiary = {
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
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate external wallet beneficiary', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Coinbase',
        phoneE164: null,
        accountType: 'external_wallet',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: null,
        isFavorite: false,
        isVerified: true,
        transferCount: 5,
        totalTransferred: 250.0,
        lastTransferAt: '2026-01-15T10:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(true);
    });

    it('should validate bank account beneficiary', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Ecobank Account',
        phoneE164: null,
        accountType: 'bank_account',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: null,
        bankCode: 'ECOBANK_CI',
        bankAccountNumber: '1234567890',
        mobileMoneyProvider: null,
        isFavorite: false,
        isVerified: true,
        transferCount: 3,
        totalTransferred: 150.0,
        lastTransferAt: '2026-01-10T08:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(true);
    });

    it('should validate mobile money beneficiary', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Orange Money - Mama',
        phoneE164: '+2250707654321',
        accountType: 'mobile_money',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: 'orange_money',
        isFavorite: true,
        isVerified: true,
        transferCount: 20,
        totalTransferred: 1000.0,
        lastTransferAt: '2026-01-25T14:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(true);
    });

    it('should validate new beneficiary with no transfers', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'New Contact',
        phoneE164: '+2250701234567',
        accountType: 'internal',
        beneficiaryUserId: '123e4567-e89b-12d3-a456-426614174002',
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: null,
        isFavorite: false,
        isVerified: false,
        transferCount: 0,
        totalTransferred: 0,
        lastTransferAt: null,
        createdAt: '2026-01-25T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if accountType is invalid', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test',
        phoneE164: '+2250701234567',
        accountType: 'invalid_type',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: null,
        isFavorite: false,
        isVerified: false,
        transferCount: 0,
        totalTransferred: 0,
        lastTransferAt: null,
        createdAt: '2026-01-25T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'accountType' }),
      );
    });

    it('should fail if mobileMoneyProvider is invalid enum', () => {
      const beneficiary = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test',
        phoneE164: '+2250701234567',
        accountType: 'mobile_money',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: 'invalid_provider',
        isFavorite: false,
        isVerified: false,
        transferCount: 0,
        totalTransferred: 0,
        lastTransferAt: null,
        createdAt: '2026-01-25T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(false);
    });

    it('should fail if required UUID fields are invalid', () => {
      const beneficiary = {
        id: 'not-a-uuid',
        walletId: 'also-not-a-uuid',
        name: 'Test',
        phoneE164: '+2250701234567',
        accountType: 'internal',
        beneficiaryUserId: null,
        beneficiaryWalletAddress: null,
        bankCode: null,
        bankAccountNumber: null,
        mobileMoneyProvider: null,
        isFavorite: false,
        isVerified: false,
        transferCount: 0,
        totalTransferred: 0,
        lastTransferAt: null,
        createdAt: '2026-01-25T12:00:00.000Z',
      };

      const result = validateSchema(beneficiary, BeneficiarySchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'id' }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'walletId' }),
      );
    });
  });

  describe('Toggle Favorite Response', () => {
    it('should validate toggle to favorite', () => {
      const response = {
        success: true,
        isFavorite: true,
      };

      const result = validateSchema(response, ToggleFavoriteResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate toggle to non-favorite', () => {
      const response = {
        success: true,
        isFavorite: false,
      };

      const result = validateSchema(response, ToggleFavoriteResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if isFavorite is missing', () => {
      const response = {
        success: true,
      };

      const result = validateSchema(response, ToggleFavoriteResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Success Response', () => {
    it('should validate update success response', () => {
      const response = {
        success: true,
        message: 'Beneficiary updated successfully',
      };

      const result = validateSchema(response, BeneficiarySuccessResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate delete success response', () => {
      const response = {
        success: true,
        message: 'Beneficiary deleted successfully',
      };

      const result = validateSchema(response, BeneficiarySuccessResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if message is missing', () => {
      const response = {
        success: true,
      };

      const result = validateSchema(response, BeneficiarySuccessResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /beneficiaries - Beneficiary List (Array Response)', () => {
    it('should be an array of beneficiaries', () => {
      const response = [
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
      ];

      // For array responses, validate each item individually
      expect(Array.isArray(response)).toBe(true);
      for (const item of response) {
        const result = validateSchema(item, BeneficiarySchema);
        expect(result.valid).toBe(true);
      }
    });

    it('should handle empty array', () => {
      const response: unknown[] = [];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(0);
    });
  });

  describe('Mobile Money Providers', () => {
    it('should validate all supported mobile money providers', () => {
      const providers = ['orange_money', 'mtn_momo', 'wave', 'moov'];

      for (const provider of providers) {
        const beneficiary = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          walletId: '123e4567-e89b-12d3-a456-426614174001',
          name: `${provider} Contact`,
          phoneE164: '+2250701234567',
          accountType: 'mobile_money',
          beneficiaryUserId: null,
          beneficiaryWalletAddress: null,
          bankCode: null,
          bankAccountNumber: null,
          mobileMoneyProvider: provider,
          isFavorite: false,
          isVerified: true,
          transferCount: 0,
          totalTransferred: 0,
          lastTransferAt: null,
          createdAt: '2026-01-25T12:00:00.000Z',
        };

        const result = validateSchema(beneficiary, BeneficiarySchema);
        expect(result.valid).toBe(true);
      }
    });
  });
});
