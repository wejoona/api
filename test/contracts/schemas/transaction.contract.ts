/**
 * Transaction API Contracts
 *
 * Defines the contracts for transaction history endpoints used by the mobile app.
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
 * Transaction metadata
 */
export const TransactionMetadataSchema: ContractSchema = {
  name: 'TransactionMetadata',
  description: 'Additional transaction details',
  fields: {
    sourceCurrency: optional(FieldType.STRING, {
      description: 'Source currency for deposits',
      example: 'XOF',
    }),
    sourceAmount: optional(FieldType.NUMBER, {
      description: 'Amount in source currency',
      example: 10000,
    }),
    sourceAmountDecimal: optional(FieldType.STRING, {
      description: 'Amount in source currency as decimal-safe string',
      example: '10000',
    }),
    rate: optional(FieldType.NUMBER, {
      description: 'Exchange rate applied',
      example: 0.00166,
    }),
    rateDecimal: optional(FieldType.STRING, {
      description: 'Exchange rate as decimal-safe string',
      example: '0.00166000',
    }),
    fee: optional(FieldType.NUMBER, {
      description: 'Fee applied',
      example: 150,
    }),
    feeDecimal: optional(FieldType.STRING, {
      description: 'Fee as decimal-safe string',
      example: '150',
    }),
    recipientPhone: optional(FieldType.PHONE, {
      description: 'Recipient phone for internal transfers',
      example: '+2250701234567',
    }),
    recipientName: optional(FieldType.STRING, {
      description: 'Recipient name',
      example: 'Amadou Diallo',
    }),
    senderPhone: optional(FieldType.PHONE, {
      description: 'Sender phone for received transfers',
      example: '+2250707654321',
    }),
    senderName: optional(FieldType.STRING, {
      description: 'Sender name',
      example: 'Fatou Traore',
    }),
    destinationAddress: optional(FieldType.STRING, {
      description: 'External wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    network: optional(FieldType.STRING, {
      description: 'Blockchain network',
      example: 'polygon',
    }),
    txHash: optional(FieldType.STRING, {
      description: 'Blockchain transaction hash',
      example: '0xabc123...',
    }),
    note: optional(FieldType.STRING, {
      description: 'Transfer note',
      example: 'Lunch money',
    }),
    provider: optional(FieldType.STRING, {
      description: 'Payment provider',
      example: 'orange_money',
    }),
  },
};

/**
 * Single transaction
 */
export const TransactionSchema: ContractSchema = {
  name: 'Transaction',
  description: 'Transaction details',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    walletId: required(FieldType.STRING, {
      description: 'Wallet ID',
      example: 'wallet-1',
    }),
    type: required(FieldType.STRING, {
      description: 'Transaction type',
      enum: [
        'deposit',
        'withdrawal',
        'internal_transfer_sent',
        'internal_transfer_received',
        'external_transfer',
        'mobile_money_deposit',
        'mobile_money_withdrawal',
      ],
      example: 'deposit',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Transaction amount',
      example: 16.45,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Transaction amount as decimal-safe string',
      example: '16.450000',
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency',
      example: 'USD',
    }),
    status: required(FieldType.STRING, {
      description: 'Transaction status',
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      example: 'completed',
    }),
    createdAt: required(FieldType.DATE, {
      description: 'Transaction creation time',
      example: '2026-01-18T12:00:00.000Z',
    }),
    completedAt: nullable(FieldType.DATE, {
      description: 'Transaction completion time',
      example: '2026-01-18T12:05:00.000Z',
    }),
    metadata: optional(FieldType.OBJECT, {
      description: 'Additional transaction details',
      nestedSchema: TransactionMetadataSchema,
    }),
    description: nullable(FieldType.STRING, {
      description: 'Mobile-safe display description, usually transfer note',
      example: 'Lunch money',
    }),
    counterpartyName: nullable(FieldType.STRING, {
      description:
        'Mobile-safe sender or recipient display name when available',
      example: 'Amadou Diallo',
    }),
    counterpartyPhone: nullable(FieldType.PHONE, {
      description: 'Mobile-safe sender or recipient phone when available',
      example: '+2250701234567',
    }),
    direction: required(FieldType.STRING, {
      description: 'Stable money direction for mobile list styling',
      enum: ['credit', 'debit', 'neutral'],
      example: 'credit',
    }),
    externalReference: nullable(FieldType.STRING, {
      description:
        'Best available external/ledger reference for receipt display',
      example: 'yc_dep_1234567890',
    }),
    supportReference: required(FieldType.STRING, {
      description: 'Stable customer support reference for this transaction',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ledgerReference: nullable(FieldType.STRING, {
      description: 'Blnk/internal ledger reference when available',
      example: 'ledger-ref-123',
    }),
    providerReference: nullable(FieldType.STRING, {
      description:
        'External payment/on-chain provider reference when available',
      example: 'yc_dep_1234567890',
    }),
    yellowCardRef: optional(FieldType.STRING, {
      description:
        'Legacy Yellow Card reference for deposits; use providerReference in new mobile clients',
      example: 'yc_dep_1234567890',
    }),
  },
};

/**
 * Transaction list response
 */
export const TransactionListResponseSchema: ContractSchema = {
  name: 'TransactionListResponse',
  description: 'Paginated transaction list',
  fields: {
    transactions: required(FieldType.ARRAY, {
      description: 'List of transactions',
      itemType: TransactionSchema,
    }),
    total: required(FieldType.NUMBER, {
      description: 'Total number of transactions',
      example: 50,
    }),
    limit: required(FieldType.NUMBER, {
      description: 'Page size',
      example: 20,
    }),
    offset: required(FieldType.NUMBER, {
      description: 'Offset from start',
      example: 0,
    }),
    hasMore: required(FieldType.BOOLEAN, {
      description: 'Whether more transactions exist',
      example: true,
    }),
  },
};

/**
 * Deposit status response
 */
export const DepositStatusResponseSchema: ContractSchema = {
  name: 'DepositStatusResponse',
  description: 'Live deposit status',
  fields: {
    transactionId: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    depositId: required(FieldType.STRING, {
      description: 'Deposit reference',
      example: 'dep_1234567890',
    }),
    status: required(FieldType.STRING, {
      description: 'Current status',
      enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
      example: 'pending',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Amount in target currency',
      example: 16.45,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Amount in target currency as decimal-safe string',
      example: '16.450000',
    }),
    sourceCurrency: required(FieldType.STRING, {
      description: 'Source currency',
      example: 'XOF',
    }),
    targetCurrency: required(FieldType.STRING, {
      description: 'Target currency',
      example: 'USD',
    }),
    rate: required(FieldType.NUMBER, {
      description: 'Exchange rate',
      example: 0.00166,
    }),
    rateDecimal: required(FieldType.STRING, {
      description: 'Exchange rate as decimal-safe string',
      example: '0.00166000',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Fee amount',
      example: 150,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Fee amount as decimal-safe string',
      example: '150',
    }),
    createdAt: required(FieldType.DATE, {
      description: 'Creation time',
      example: '2026-01-18T12:00:00.000Z',
    }),
    completedAt: nullable(FieldType.DATE, {
      description: 'Completion time',
      example: null,
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const GetTransactionsQuerySchema: ContractSchema = {
  name: 'GetTransactionsQuery',
  description: 'Query parameters for transaction list',
  fields: {
    type: optional(FieldType.STRING, {
      description: 'Filter by transaction type',
      enum: [
        'deposit',
        'withdrawal',
        'transfer_internal',
        'transfer_external',
        'internal_transfer_sent',
        'internal_transfer_received',
        'external_transfer',
        'mobile_money_deposit',
        'mobile_money_withdrawal',
        'all',
      ],
      example: 'all',
    }),
    status: optional(FieldType.STRING, {
      description: 'Filter by status',
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      example: 'completed',
    }),
    startDate: optional(FieldType.DATE, {
      description: 'Filter from date',
      example: '2026-01-01T00:00:00.000Z',
    }),
    endDate: optional(FieldType.DATE, {
      description: 'Filter to date',
      example: '2026-01-31T23:59:59.999Z',
    }),
    minAmount: optional(FieldType.NUMBER, {
      description: 'Minimum amount filter',
      example: 10,
    }),
    maxAmount: optional(FieldType.NUMBER, {
      description: 'Maximum amount filter',
      example: 1000,
    }),
    search: optional(FieldType.STRING, {
      description: 'Text search',
      example: 'Amadou',
    }),
    sortBy: optional(FieldType.STRING, {
      description: 'Sort field',
      enum: ['createdAt', 'amount', 'status'],
      example: 'createdAt',
    }),
    sortOrder: optional(FieldType.STRING, {
      description: 'Sort direction',
      enum: ['asc', 'desc'],
      example: 'desc',
    }),
    limit: optional(FieldType.NUMBER, {
      description: 'Page size',
      example: 20,
      min: 1,
      max: 100,
    }),
    offset: optional(FieldType.NUMBER, {
      description: 'Offset from start',
      example: 0,
      min: 0,
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const TransactionErrorSchema: ContractSchema = {
  name: 'TransactionError',
  description: 'Error response for transaction endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 404,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Transaction not found',
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

export const GetTransactionsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/transactions',
  description: 'Get transaction history with filtering',
  auth: 'bearer',
  queryParams: GetTransactionsQuerySchema,
  responses: {
    200: TransactionListResponseSchema,
    401: TransactionErrorSchema,
  },
  exampleResponse: {
    200: {
      transactions: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          walletId: 'wallet-1',
          type: 'deposit',
          amount: 16.45,
          currency: 'USD',
          status: 'completed',
          createdAt: '2026-01-18T12:00:00.000Z',
          completedAt: '2026-01-18T12:05:00.000Z',
          metadata: {
            sourceCurrency: 'XOF',
            sourceAmount: 10000,
            rate: 0.00166,
            fee: 150,
            provider: 'orange_money',
          },
        },
      ],
      total: 50,
      limit: 20,
      offset: 0,
      hasMore: true,
    },
  },
};

export const GetTransactionEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/transactions/:id',
  description: 'Get single transaction details',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
  },
  responses: {
    200: TransactionSchema,
    404: TransactionErrorSchema,
  },
  exampleResponse: {
    200: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      walletId: 'wallet-1',
      type: 'deposit',
      amount: 16.45,
      currency: 'USD',
      status: 'completed',
      createdAt: '2026-01-18T12:00:00.000Z',
      completedAt: '2026-01-18T12:05:00.000Z',
      yellowCardRef: 'yc_dep_1234567890',
      metadata: {
        sourceCurrency: 'XOF',
        sourceAmount: 10000,
        rate: 0.00166,
        fee: 150,
      },
    },
  },
};

export const GetDepositStatusEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/transactions/deposit/:id/status',
  description: 'Get live deposit status',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
  },
  responses: {
    200: DepositStatusResponseSchema,
    404: TransactionErrorSchema,
  },
  exampleResponse: {
    200: {
      transactionId: '123e4567-e89b-12d3-a456-426614174000',
      depositId: 'dep_1234567890',
      status: 'pending',
      amount: 16.45,
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      rate: 0.00166,
      fee: 150,
      createdAt: '2026-01-18T12:00:00.000Z',
      completedAt: null,
    },
  },
};

// ============================================
// Contract Group
// ============================================

export const TransactionContractGroup: ContractGroup = {
  name: 'Transactions',
  basePath: '/wallet/transactions',
  description: 'Transaction history and status endpoints',
  endpoints: [
    GetTransactionsEndpoint,
    GetTransactionEndpoint,
    GetDepositStatusEndpoint,
  ],
};
