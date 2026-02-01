/**
 * Wallet Contract Tests
 *
 * Validates that wallet API responses match mobile app expectations.
 */

import {
  WalletBalanceResponseSchema,
  WalletCreateResponseSchema,
  DepositChannelsResponseSchema,
  DepositResponseSchema,
  InternalTransferResponseSchema,
  ExternalTransferResponseSchema,
  WithdrawResponseSchema,
  RateResponseSchema,
  PinVerifyResponseSchema,
  PinSetResponseSchema,
} from '../schemas/wallet.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Wallet Contracts', () => {
  describe('GET /wallet - Balance Response', () => {
    it('should validate successful balance response', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        currency: 'USD',
        balances: [
          { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
        ],
      };

      const result = validateSchema(response, WalletBalanceResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate response with multiple balances', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        currency: 'USD',
        balances: [
          { currency: 'USD', available: 100.0, pending: 10, total: 110.0 },
          { currency: 'USDC', available: 50.0, pending: 0, total: 50.0 },
        ],
      };

      const result = validateSchema(response, WalletBalanceResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if walletId is not a UUID', () => {
      const response = {
        walletId: 'not-a-uuid',
        currency: 'USD',
        balances: [
          { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
        ],
      };

      const result = validateSchema(response, WalletBalanceResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'walletId' }),
      );
    });

    it('should fail if balance item is missing required field', () => {
      const response = {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        currency: 'USD',
        balances: [
          { currency: 'USD', available: 100.0 }, // Missing pending and total
        ],
      };

      const result = validateSchema(response, WalletBalanceResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /wallet/create - Wallet Create Response', () => {
    it('should validate successful wallet creation', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        circleWalletId: '55c56c99-63f9-5426-ab08-10d40d196a8f',
        circleWalletAddress: '0x3ca7a6241ee8490dc847b3ee9635b4ecfe9f9bc5',
        currency: 'USDC',
        balance: 0,
        status: 'active',
      };

      const result = validateSchema(response, WalletCreateResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow optional Circle fields to be missing', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        currency: 'USDC',
        balance: 0,
        status: 'pending',
      };

      const result = validateSchema(response, WalletCreateResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if status is invalid enum', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        currency: 'USDC',
        balance: 0,
        status: 'invalid',
      };

      const result = validateSchema(response, WalletCreateResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'status' }),
      );
    });
  });

  describe('GET /wallet/deposit/channels - Deposit Channels Response', () => {
    it('should validate deposit channels response', () => {
      const response = {
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
            currency: 'XOF',
          },
        ],
      };

      const result = validateSchema(response, DepositChannelsResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate multiple channels', () => {
      const response = {
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
            currency: 'XOF',
          },
          {
            id: 'mtn_momo_ci',
            name: 'MTN MoMo',
            type: 'mobile_money',
            provider: 'mtn',
            country: 'CI',
            minAmount: 500,
            maxAmount: 300000,
            fee: 2.0,
            feeType: 'percentage',
            currency: 'XOF',
          },
        ],
      };

      const result = validateSchema(response, DepositChannelsResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /wallet/deposit - Deposit Response', () => {
    it('should validate successful deposit initiation', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        amount: 10000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        fee: 150,
        estimatedAmount: 16.45,
        paymentInstructions: {
          type: 'mobile_money',
          provider: 'orange',
          accountNumber: '+2250700000000',
          reference: 'DEP-ABC12345',
          instructions: 'Send 10000 XOF to the number above...',
        },
        expiresAt: '2026-01-18T13:00:00.000Z',
      };

      const result = validateSchema(response, DepositResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if paymentInstructions is missing', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        amount: 10000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        fee: 150,
        estimatedAmount: 16.45,
        expiresAt: '2026-01-18T13:00:00.000Z',
      };

      const result = validateSchema(response, DepositResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /wallet/transfer/internal - Internal Transfer Response', () => {
    it('should validate successful internal transfer', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-2',
        toPhone: '+2250701234567',
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'completed',
      };

      const result = validateSchema(response, InternalTransferResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if status is invalid', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-2',
        toPhone: '+2250701234567',
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'processing', // Invalid for internal transfer
      };

      const result = validateSchema(response, InternalTransferResponseSchema);
      expect(result.valid).toBe(false);
    });

    it('should fail if phone is not E.164 format', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-2',
        toPhone: '0701234567', // Invalid
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'completed',
      };

      const result = validateSchema(response, InternalTransferResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /wallet/transfer/external - External Transfer Response', () => {
    it('should validate successful external transfer', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        toAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 50,
        currency: 'USD',
        fee: 1.0,
        status: 'pending',
        estimatedArrival: '5-30 minutes',
      };

      const result = validateSchema(response, ExternalTransferResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow estimatedArrival to be optional', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        toAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 50,
        currency: 'USD',
        fee: 1.0,
        status: 'pending',
      };

      const result = validateSchema(response, ExternalTransferResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /wallet/withdraw - Withdraw Response', () => {
    it('should validate successful withdrawal', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50.0,
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'polygon',
        fee: 0.25,
        status: 'pending',
      };

      const result = validateSchema(response, WithdrawResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if network is invalid', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50.0,
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'solana', // Invalid
        fee: 0.25,
        status: 'pending',
      };

      const result = validateSchema(response, WithdrawResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /wallet/rate - Rate Response', () => {
    it('should validate successful rate quote', () => {
      const response = {
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        sourceAmount: 10000,
        targetAmount: 16.6,
        fee: 150,
        expiresAt: '2026-01-18T12:05:00.000Z',
      };

      const result = validateSchema(response, RateResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if expiresAt is not ISO date', () => {
      const response = {
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        sourceAmount: 10000,
        targetAmount: 16.6,
        fee: 150,
        expiresAt: '2026-01-18', // Not ISO format
      };

      const result = validateSchema(response, RateResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /wallet/pin/verify - PIN Verify Response', () => {
    it('should validate successful PIN verification', () => {
      const response = {
        valid: true,
        message: 'PIN verified successfully',
        pinToken: 'abc123...',
        expiresIn: 300,
      };

      const result = validateSchema(response, PinVerifyResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if pinToken is missing', () => {
      const response = {
        valid: true,
        message: 'PIN verified successfully',
        expiresIn: 300,
      };

      const result = validateSchema(response, PinVerifyResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /wallet/pin/set - PIN Set Response', () => {
    it('should validate successful PIN set', () => {
      const response = {
        success: true,
        message: 'PIN set successfully',
      };

      const result = validateSchema(response, PinSetResponseSchema);
      expect(result.valid).toBe(true);
    });
  });
});
