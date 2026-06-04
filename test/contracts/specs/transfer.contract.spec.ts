/**
 * Transfer Contract Tests
 */

import {
  InternalTransferRequestV2Schema,
  TransferResponseSchema,
} from '../schemas/transfer.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Transfer Contracts', () => {
  describe('POST /transfers/internal', () => {
    it('should validate mobile internal transfer request with decimal USDC amount', () => {
      const request = {
        recipientPhone: '+2250701234567',
        amount: 50.25,
        currency: 'USDC',
        note: 'Payment for lunch',
      };

      const result = validateSchema(request, InternalTransferRequestV2Schema);
      expect(result.valid).toBe(true);
    });

    it('should reject legacy toPhone request key for /transfers/internal', () => {
      const request = {
        toPhone: '+2250701234567',
        amount: 50,
        currency: 'USDC',
      };

      const result = validateSchema(request, InternalTransferRequestV2Schema);
      expect(result.valid).toBe(false);
    });

    it('should validate transfer response returned by TransferController', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reference: 'INT-123E4567',
        type: 'internal',
        status: 'completed',
        senderId: '123e4567-e89b-12d3-a456-426614174001',
        senderWalletId: 'wallet-1',
        recipientWalletId: 'wallet-2',
        recipientPhone: '+2250701234567',
        amount: 50.25,
        fee: 0,
        totalAmount: 50.25,
        currency: 'USDC',
        note: 'Payment for lunch',
        supportReference: 'support-ref-123',
        ledgerReference: 'ledger-ref-123',
        ledgerTransactionId: 'blnk_txn_123',
        createdAt: '2026-06-04T12:00:00.000Z',
        updatedAt: '2026-06-04T12:00:00.000Z',
        completedAt: '2026-06-04T12:00:01.000Z',
      };

      const result = validateSchema(response, TransferResponseSchema);
      expect(result.valid).toBe(true);
    });
  });
});
