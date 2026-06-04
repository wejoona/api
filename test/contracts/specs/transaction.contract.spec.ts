/**
 * Transaction Contract Tests
 *
 * Validates that transaction API responses match mobile app expectations.
 */

import {
  TransactionSchema,
  TransactionListResponseSchema,
  DepositStatusResponseSchema,
} from '../schemas/transaction.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Transaction Contracts', () => {
  describe('GET /wallet/transactions - Transaction List Response', () => {
    it('should validate successful transaction list response', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'deposit',
            amount: 16.45,
            amountDecimal: '16.45',
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:05:00.000Z',
          },
        ],
        total: 50,
        limit: 20,
        offset: 0,
        hasMore: true,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty transaction list', () => {
      const response = {
        transactions: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate transaction with metadata', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'mobile_money_deposit',
            amount: 16.45,
            amountDecimal: '16.45',
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:05:00.000Z',
            metadata: {
              sourceCurrency: 'XOF',
              sourceAmount: 10000,
              sourceAmountDecimal: '10000',
              rate: 0.00166,
              rateDecimal: '0.00166000',
              fee: 150,
              feeDecimal: '150',
              provider: 'orange_money',
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate internal transfer sent transaction', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'internal_transfer_sent',
            amount: 50.0,
            amountDecimal: '50.00',
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:00:01.000Z',
            metadata: {
              recipientPhone: '+2250701234567',
              recipientName: 'Amadou Diallo',
              note: 'Lunch money',
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate internal transfer received transaction', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'internal_transfer_received',
            amount: 50.0,
            amountDecimal: '50.00',
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:00:01.000Z',
            metadata: {
              senderPhone: '+2250707654321',
              senderName: 'Fatou Traore',
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate external transfer transaction', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'external_transfer',
            amount: 100.0,
            amountDecimal: '100.00',
            currency: 'USD',
            status: 'pending',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: null,
            metadata: {
              destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
              network: 'polygon',
              txHash: '0xabc123...',
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if transaction type is invalid', () => {
      const response = {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'invalid_type',
            amount: 16.45,
            amountDecimal: '16.45',
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:05:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(false);
    });

    it('should fail if pagination fields are missing', () => {
      const response = {
        transactions: [],
        total: 0,
        // Missing limit, offset, hasMore
      };

      const result = validateSchema(response, TransactionListResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /wallet/transactions/:id - Single Transaction', () => {
    it('should validate complete transaction details', () => {
      const transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        type: 'deposit',
        amount: 16.45,
        amountDecimal: '16.45',
        currency: 'USD',
        status: 'completed',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: '2026-01-18T12:05:00.000Z',
        yellowCardRef: 'yc_dep_1234567890',
        metadata: {
          sourceCurrency: 'XOF',
          sourceAmount: 10000,
          sourceAmountDecimal: '10000',
          rate: 0.00166,
          rateDecimal: '0.00166000',
          fee: 150,
          feeDecimal: '150',
        },
      };

      const result = validateSchema(transaction, TransactionSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow completedAt to be null for pending transactions', () => {
      const transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        type: 'withdrawal',
        amount: 50.0,
        amountDecimal: '50.00',
        currency: 'USD',
        status: 'pending',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: null,
      };

      const result = validateSchema(transaction, TransactionSchema);
      expect(result.valid).toBe(true);
    });

    it('should allow metadata to be optional', () => {
      const transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        type: 'deposit',
        amount: 16.45,
        amountDecimal: '16.45',
        currency: 'USD',
        status: 'completed',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: '2026-01-18T12:05:00.000Z',
      };

      const result = validateSchema(transaction, TransactionSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if status is invalid', () => {
      const transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        type: 'deposit',
        amount: 16.45,
        amountDecimal: '16.45',
        currency: 'USD',
        status: 'unknown',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: '2026-01-18T12:05:00.000Z',
      };

      const result = validateSchema(transaction, TransactionSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /wallet/transactions/deposit/:id/status - Deposit Status', () => {
    it('should validate pending deposit status', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        status: 'pending',
        amount: 16.45,
        amountDecimal: '16.45',
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        rateDecimal: '0.00166000',
        fee: 150,
        feeDecimal: '150',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: null,
      };

      const result = validateSchema(response, DepositStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate completed deposit status', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        status: 'completed',
        amount: 16.45,
        amountDecimal: '16.45',
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        rateDecimal: '0.00166000',
        fee: 150,
        feeDecimal: '150',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: '2026-01-18T12:05:00.000Z',
      };

      const result = validateSchema(response, DepositStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate expired deposit status', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        status: 'expired',
        amount: 16.45,
        amountDecimal: '16.45',
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        rateDecimal: '0.00166000',
        fee: 150,
        feeDecimal: '150',
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: null,
      };

      const result = validateSchema(response, DepositStatusResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if required fields are missing', () => {
      const response = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending',
        // Missing depositId, amount, currencies, rate, fee, createdAt
      };

      const result = validateSchema(response, DepositStatusResponseSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
