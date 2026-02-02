/**
 * Authentication Contract Tests
 *
 * Validates that auth API responses match mobile app expectations.
 */

import {
  OtpSentResponseSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  LogoutResponseSchema,
  LogoutAllResponseSchema,
  UserSchema,
} from '../schemas/auth.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Authentication Contracts', () => {
  describe('POST /auth/register - OTP Sent Response', () => {
    it('should validate successful OTP sent response', () => {
      const response = {
        success: true,
        message: 'OTP sent successfully. Please verify your phone number.',
        expiresIn: 300,
      };

      const result = validateSchema(response, OtpSentResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if success is missing', () => {
      const response = {
        message: 'OTP sent successfully',
        expiresIn: 300,
      };

      const result = validateSchema(response, OtpSentResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'success',
          message: 'Missing required field',
        }),
      );
    });

    it('should fail if expiresIn is not a number', () => {
      const response = {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: '300', // Should be number
      };

      const result = validateSchema(response, OtpSentResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'expiresIn',
          message: 'Expected number',
        }),
      );
    });
  });

  describe('POST /auth/verify-otp - Auth Response', () => {
    const validUser = {
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
    };

    it('should validate successful auth response', () => {
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900, // CRITICAL: Mobile uses this for token refresh scheduling
        user: validUser,
        kycStatus: 'pending',
      };

      const result = validateSchema(response, AuthResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow kycStatus to be optional', () => {
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
        user: validUser,
      };

      const result = validateSchema(response, AuthResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('CRITICAL: should fail if expiresIn is missing', () => {
      // This is the bug that caused KYC upload failures
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        // Missing expiresIn!
        user: validUser,
        kycStatus: 'pending',
      };

      const result = validateSchema(response, AuthResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'expiresIn',
          message: 'Missing required field',
        }),
      );
    });

    it('should fail if accessToken is missing', () => {
      const response = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: validUser,
      };

      const result = validateSchema(response, AuthResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'accessToken' }),
      );
    });

    it('should fail if user object is missing required fields', () => {
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          phone: '+2250701234567',
          // Missing other required fields
        },
      };

      const result = validateSchema(response, AuthResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/refresh - Refresh Response', () => {
    it('should validate successful refresh response', () => {
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
      };

      const result = validateSchema(response, RefreshResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if refreshToken is missing', () => {
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
      };

      const result = validateSchema(response, RefreshResponseSchema);
      expect(result.valid).toBe(false);
    });

    it('CRITICAL: should fail if expiresIn is missing', () => {
      // This is what caused the token refresh scheduling bug
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        // Missing expiresIn!
      };

      const result = validateSchema(response, RefreshResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'expiresIn',
          message: 'Missing required field',
        }),
      );
    });

    it('CRITICAL: should fail if expiresIn is too low', () => {
      // Token must be valid for at least 5 minutes
      const response = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 60, // Too short!
      };

      const result = validateSchema(response, RefreshResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'expiresIn',
        }),
      );
    });
  });

  describe('POST /auth/logout - Logout Response', () => {
    it('should validate successful logout response', () => {
      const response = {
        success: true,
        message: 'Logged out successfully',
      };

      const result = validateSchema(response, LogoutResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /auth/logout-all - Logout All Response', () => {
    it('should validate successful logout all response', () => {
      const response = {
        success: true,
        message: 'All devices logged out successfully',
        sessionsInvalidated: 5,
      };

      const result = validateSchema(response, LogoutAllResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow sessionsInvalidated to be optional', () => {
      const response = {
        success: true,
        message: 'All devices logged out successfully',
      };

      const result = validateSchema(response, LogoutAllResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('User Schema', () => {
    it('should validate complete user object', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone: '+2250701234567',
        phoneVerified: true,
        username: 'amadou_diallo',
        firstName: 'Amadou',
        lastName: 'Diallo',
        email: 'amadou@example.com',
        countryCode: 'CI',
        kycStatus: 'approved',
        canTransact: true,
        canWithdraw: true,
        createdAt: '2026-01-18T12:00:00.000Z',
      };

      const result = validateSchema(user, UserSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow nullable fields to be null', () => {
      const user = {
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
      };

      const result = validateSchema(user, UserSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if phone is not E.164 format', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone: '0701234567', // Invalid format
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
      };

      const result = validateSchema(user, UserSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'phone' }),
      );
    });

    it('should fail if kycStatus is invalid enum', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone: '+2250701234567',
        phoneVerified: true,
        username: null,
        firstName: null,
        lastName: null,
        email: null,
        countryCode: 'CI',
        kycStatus: 'invalid_status', // Invalid enum
        canTransact: false,
        canWithdraw: false,
        createdAt: '2026-01-18T12:00:00.000Z',
      };

      const result = validateSchema(user, UserSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'kycStatus',
          message: expect.stringContaining('Invalid enum'),
        }),
      );
    });

    it('should fail if id is not a valid UUID', () => {
      const user = {
        id: 'not-a-valid-uuid',
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
      };

      const result = validateSchema(user, UserSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'id', message: 'Expected UUID' }),
      );
    });
  });
});
