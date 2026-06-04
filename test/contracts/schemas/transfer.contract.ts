/**
 * Transfer API Contracts
 *
 * Defines money movement contracts used directly by the mobile send and QR flows.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  nullable,
  optional,
  required,
} from './types';
import { PinErrorSchema } from './wallet.contract';

export const InternalTransferRequestV2Schema: ContractSchema = {
  name: 'InternalTransferRequestV2',
  description: 'Request for P2P transfer through /transfers/internal',
  fields: {
    recipientPhone: required(FieldType.PHONE, {
      description: 'Recipient phone number in E.164 format',
      example: '+2250701234567',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Amount in USDC major units, not cents',
      example: 50.25,
      min: 0.01,
    }),
    currency: optional(FieldType.STRING, {
      description: 'Currency, defaults to USDC',
      example: 'USDC',
    }),
    note: optional(FieldType.STRING, {
      description: 'Optional transfer note',
      example: 'Payment for lunch',
      maxLength: 500,
    }),
  },
};

export const TransferResponseSchema: ContractSchema = {
  name: 'TransferResponse',
  description: 'Response after transfer creation',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Transfer transaction id',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    reference: required(FieldType.STRING, {
      description: 'Human-readable transfer reference',
      example: 'INT-123E4567',
    }),
    type: required(FieldType.STRING, {
      enum: ['internal', 'external'],
      example: 'internal',
    }),
    status: required(FieldType.STRING, {
      enum: [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded',
      ],
      example: 'completed',
    }),
    senderId: required(FieldType.UUID, {
      example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    senderWalletId: required(FieldType.STRING, {
      example: 'wallet-1',
    }),
    recipientWalletId: optional(FieldType.STRING, {
      example: 'wallet-2',
    }),
    recipientPhone: optional(FieldType.PHONE, {
      example: '+2250701234567',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Amount in USDC major units, not cents',
      example: 50.25,
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Fee in USDC major units',
      example: 0,
    }),
    totalAmount: required(FieldType.NUMBER, {
      description: 'Amount plus fee in USDC major units',
      example: 50.25,
    }),
    currency: required(FieldType.STRING, {
      example: 'USDC',
    }),
    note: nullable(FieldType.STRING, {
      example: 'Payment for lunch',
    }),
    supportReference: optional(FieldType.STRING, {
      example: 'support-ref-123',
    }),
    ledgerReference: optional(FieldType.STRING, {
      example: 'ledger-ref-123',
    }),
    ledgerTransactionId: optional(FieldType.STRING, {
      example: 'blnk_txn_123',
    }),
    createdAt: required(FieldType.DATE, {
      example: '2026-06-04T12:00:00.000Z',
    }),
    updatedAt: required(FieldType.DATE, {
      example: '2026-06-04T12:00:00.000Z',
    }),
    completedAt: optional(FieldType.DATE, {
      example: '2026-06-04T12:00:01.000Z',
    }),
  },
};

export const InternalTransferV2Endpoint: EndpointContract = {
  method: 'POST',
  path: '/transfers/internal',
  description: 'Transfer USDC to another Korido user by phone number',
  auth: 'pin-token',
  headers: {
    'X-Idempotency-Key': 'UUID for idempotency',
    'X-Pin-Token': 'PIN verification token',
  },
  requestBody: InternalTransferRequestV2Schema,
  responses: {
    200: TransferResponseSchema,
    400: PinErrorSchema,
  },
};

export const TransferContractGroup: ContractGroup = {
  name: 'Transfers',
  basePath: '/transfers',
  description: 'Money movement routes used by mobile send and QR payment flows',
  endpoints: [InternalTransferV2Endpoint],
};
