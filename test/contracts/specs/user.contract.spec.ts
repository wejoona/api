/**
 * User Contract Tests
 *
 * Validates that user API responses match mobile app expectations.
 */

import {
  AvatarStorageUnavailableSchema,
  CheckUsernameResponseSchema,
  ProfileDependencyUnavailableSchema,
  SearchUsernameResponseSchema,
  UserLimitsResponseSchema,
} from '../schemas/user.contract';
import { UserSchema } from '../schemas/auth.contract';
import { validateSchema } from '../validators/schema-validator';

const createMobileUserProfile = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
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
  ...overrides,
});

describe('User Contracts', () => {
  describe('GET /user/profile - User Profile Response', () => {
    it('should validate complete user profile', () => {
      const response = createMobileUserProfile({
        avatarUrl: '/user/avatar/123e4567-e89b-12d3-a456-426614174000',
        avatarThumb: 'data:image/jpeg;base64,abc123',
        preferredLocale: 'fr',
      });

      const result = validateSchema(response, UserSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(response).toEqual(
        expect.objectContaining({
          firstName: 'Amadou',
          lastName: 'Diallo',
          avatarUrl: expect.any(String),
          avatarThumb: expect.any(String),
          preferredLocale: 'fr',
          countryCode: 'CI',
          kycStatus: 'approved',
          kycRejectionReason: null,
          hasPin: true,
        }),
      );
    });

    it('should validate new user profile with minimal data', () => {
      const response = createMobileUserProfile({
        username: null,
        firstName: null,
        lastName: null,
        email: null,
        avatarUrl: null,
        avatarThumb: null,
        preferredLocale: 'fr',
        kycStatus: 'pending',
        kycRejectionReason: null,
        canTransact: false,
        canWithdraw: false,
        hasPin: false,
        createdAt: '2026-01-25T12:00:00.000Z',
      });

      const result = validateSchema(response, UserSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate user from different country', () => {
      const response = createMobileUserProfile({
        phone: '+221701234567', // Senegal
        username: 'fatou_traore',
        firstName: 'Fatou',
        lastName: 'Traore',
        email: null,
        countryCode: 'SN', // Senegal
        kycStatus: 'approved',
      });

      const result = validateSchema(response, UserSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Profile and avatar dependency failures', () => {
    it('should validate mobile-safe profile dependency unavailable envelopes', () => {
      const response = {
        success: false,
        error: {
          code: 'PROFILE_DEPENDENCY_UNAVAILABLE',
          message: 'Profile is temporarily unavailable. Please try again later.',
          dependency: 'user_profile_store',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/user/profile',
          method: 'GET',
          timestamp: '2026-06-04T12:00:00.000Z',
        },
      };

      const result = validateSchema(response, ProfileDependencyUnavailableSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate mobile-safe avatar storage unavailable envelopes', () => {
      const response = {
        success: false,
        error: {
          code: 'AVATAR_STORAGE_UNAVAILABLE',
          message:
            'Profile photo storage is temporarily unavailable. Please try again later.',
          dependency: 'avatar_storage',
          retryable: true,
          supportReviewRequired: false,
        },
        meta: {
          path: '/api/v1/user/avatar',
          method: 'POST',
          timestamp: '2026-06-04T12:00:00.000Z',
        },
      };

      const result = validateSchema(response, AvatarStorageUnavailableSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('PUT /user/profile - Update Profile Response', () => {
    it('should validate updated profile with username', () => {
      const response = createMobileUserProfile({
        username: 'new_username',
        firstName: 'Amadou',
        lastName: 'Diallo',
        email: 'newemail@example.com',
      });

      const result = validateSchema(response, UserSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('GET /user/username/check/:username - Check Username Response', () => {
    it('should validate available username', () => {
      const response = {
        available: true,
        username: 'amadou_diallo',
      };

      const result = validateSchema(response, CheckUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate unavailable username with suggestions', () => {
      const response = {
        available: false,
        username: 'amadou_diallo',
        suggestions: ['amadou_diallo1', 'amadou_diallo_ci', 'amadou_d'],
      };

      const result = validateSchema(response, CheckUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow suggestions to be optional when available', () => {
      const response = {
        available: true,
        username: 'unique_username',
      };

      const result = validateSchema(response, CheckUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate empty suggestions array', () => {
      const response = {
        available: false,
        username: 'taken_username',
        suggestions: [],
      };

      const result = validateSchema(response, CheckUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('GET /user/username/search - Search Username Response', () => {
    it('should validate search results', () => {
      const response = {
        users: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'amadou_diallo',
            firstName: 'Amadou',
            lastName: 'Diallo',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            username: 'amadou_traore',
            firstName: 'Amadou',
            lastName: 'Traore',
          },
        ],
        count: 2,
      };

      const result = validateSchema(response, SearchUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate empty search results', () => {
      const response = {
        users: [],
        count: 0,
      };

      const result = validateSchema(response, SearchUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate search result with null names', () => {
      const response = {
        users: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'anon_user',
            firstName: null,
            lastName: null,
          },
        ],
        count: 1,
      };

      const result = validateSchema(response, SearchUsernameResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if user id is not UUID', () => {
      const response = {
        users: [
          {
            id: 'not-a-uuid',
            username: 'amadou_diallo',
            firstName: 'Amadou',
            lastName: 'Diallo',
          },
        ],
        count: 1,
      };

      const result = validateSchema(response, SearchUsernameResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /user/by-username/:username - Find By Username Response', () => {
    it('should validate found user', () => {
      const response = createMobileUserProfile();

      const result = validateSchema(response, UserSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('GET /user/limits - User Limits Response', () => {
    it('should validate complete limits response', () => {
      const response = {
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
      };

      const result = validateSchema(response, UserLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate tier 0 limits (no KYC)', () => {
      const response = {
        kycTier: 0,
        limits: {
          dailyDeposit: 100,
          monthlyDeposit: 500,
          dailyWithdrawal: 0,
          monthlyWithdrawal: 0,
          singleTransaction: 50,
        },
        usage: {
          dailyDeposit: 0,
          monthlyDeposit: 0,
          dailyWithdrawal: 0,
          monthlyWithdrawal: 0,
        },
        remaining: {
          dailyDeposit: 100,
          monthlyDeposit: 500,
          dailyWithdrawal: 0,
          monthlyWithdrawal: 0,
        },
      };

      const result = validateSchema(response, UserLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate tier 3 limits (maximum)', () => {
      const response = {
        kycTier: 3,
        limits: {
          dailyDeposit: 100000,
          monthlyDeposit: 1000000,
          dailyWithdrawal: 50000,
          monthlyWithdrawal: 500000,
          singleTransaction: 25000,
        },
        usage: {
          dailyDeposit: 5000,
          monthlyDeposit: 100000,
          dailyWithdrawal: 1000,
          monthlyWithdrawal: 25000,
        },
        remaining: {
          dailyDeposit: 95000,
          monthlyDeposit: 900000,
          dailyWithdrawal: 49000,
          monthlyWithdrawal: 475000,
        },
      };

      const result = validateSchema(response, UserLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate limits when near capacity', () => {
      const response = {
        kycTier: 1,
        limits: {
          dailyDeposit: 500,
          monthlyDeposit: 2000,
          dailyWithdrawal: 250,
          monthlyWithdrawal: 1000,
          singleTransaction: 250,
        },
        usage: {
          dailyDeposit: 450,
          monthlyDeposit: 1900,
          dailyWithdrawal: 200,
          monthlyWithdrawal: 950,
        },
        remaining: {
          dailyDeposit: 50,
          monthlyDeposit: 100,
          dailyWithdrawal: 50,
          monthlyWithdrawal: 50,
        },
      };

      const result = validateSchema(response, UserLimitsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if nested limits object is incomplete', () => {
      const response = {
        kycTier: 2,
        limits: {
          dailyDeposit: 1000,
          // Missing other fields
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
      };

      const result = validateSchema(response, UserLimitsResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('KYC Status Values', () => {
    it('should validate all KYC status values', () => {
      const statuses = ['pending', 'submitted', 'approved', 'rejected'];

      for (const status of statuses) {
        const response = createMobileUserProfile({
          username: null,
          firstName: null,
          lastName: null,
          email: null,
          kycStatus: status,
          kycRejectionReason:
            status === 'rejected' ? 'Document photo is unclear' : null,
          canTransact: status === 'approved',
          canWithdraw: status === 'approved',
          createdAt: '2026-01-25T12:00:00.000Z',
        });

        const result = validateSchema(response, UserSchema);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Country Codes', () => {
    it('should validate various West African country codes', () => {
      const countries = [
        { code: 'CI', phone: '+2250701234567' }, // Cote d'Ivoire
        { code: 'SN', phone: '+221701234567' }, // Senegal
        { code: 'ML', phone: '+223701234567' }, // Mali
        { code: 'BF', phone: '+226701234567' }, // Burkina Faso
        { code: 'GN', phone: '+224701234567' }, // Guinea
      ];

      for (const { code, phone } of countries) {
        const response = createMobileUserProfile({
          phone,
          username: null,
          firstName: null,
          lastName: null,
          email: null,
          countryCode: code,
          kycStatus: 'pending',
          canTransact: false,
          canWithdraw: false,
          createdAt: '2026-01-25T12:00:00.000Z',
        });

        const result = validateSchema(response, UserSchema);
        expect(result.valid).toBe(true);
      }
    });
  });
});
