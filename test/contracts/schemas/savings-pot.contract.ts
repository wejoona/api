/**
 * Savings Pot API Contracts
 *
 * Covers savings pot child screens consumed by mobile.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  optional,
  required,
} from './types';

export const SavingsPotTransactionSchema: ContractSchema = {
  name: 'SavingsPotTransaction',
  description: 'Single savings pot money movement',
  fields: {
    id: required(FieldType.STRING, {
      description: 'Savings pot transaction identifier',
      example: 'sptx_123',
    }),
    potId: required(FieldType.UUID, {
      description: 'Savings pot UUID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    type: required(FieldType.STRING, {
      description: 'Savings pot movement type',
      enum: ['deposit', 'withdraw'],
      example: 'deposit',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Movement amount',
      example: 25,
      min: 0,
    }),
    timestamp: required(FieldType.DATE, {
      description: 'Movement timestamp',
      example: '2026-06-04T10:30:00.000Z',
    }),
    note: optional(FieldType.STRING, {
      description: 'Optional user-visible movement note',
      example: 'Added to Vacation Fund',
    }),
  },
};

export const SavingsPotTransactionListResponseSchema: ContractSchema = {
  name: 'SavingsPotTransactionListResponse',
  description:
    'Savings pot transaction history response. Empty until ledger-backed savings history is projected.',
  fields: {
    transactions: required(FieldType.ARRAY, {
      description: 'Canonical mobile savings pot transaction list',
      itemType: SavingsPotTransactionSchema,
    }),
    items: required(FieldType.ARRAY, {
      description: 'Alias for wrapper-tolerant mobile parsers',
      itemType: SavingsPotTransactionSchema,
    }),
    total: required(FieldType.NUMBER, {
      description: 'Total transactions in this response',
      example: 0,
      min: 0,
    }),
  },
};

export const SavingsPotTransactionsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/savings-pots/:id/transactions',
  description: 'Get savings pot transaction history',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Savings pot UUID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
  },
  responses: {
    200: SavingsPotTransactionListResponseSchema,
  },
};

export const SavingsPotContractGroup: ContractGroup = {
  name: 'Savings Pots',
  basePath: '/savings-pots',
  description: 'Savings pot mobile-facing endpoints and child-screen payloads.',
  endpoints: [SavingsPotTransactionsEndpoint],
};
