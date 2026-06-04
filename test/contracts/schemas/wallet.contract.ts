/**
 * Wallet API Contracts
 *
 * Defines the contracts for all wallet endpoints used by the mobile app.
 */

import {
  ContractSchema,
  EndpointContract,
  ContractGroup,
  FieldType,
  required,
  optional,
} from './types';

// ============================================
// Response Schemas
// ============================================

/**
 * Balance item in wallet response
 */
export const BalanceItemSchema: ContractSchema = {
  name: 'BalanceItem',
  description: 'Balance for a specific currency',
  fields: {
    currency: required(FieldType.STRING, {
      description: 'Currency code',
      example: 'USD',
    }),
    available: required(FieldType.NUMBER, {
      description: 'Available balance',
      example: 100.0,
    }),
    availableDecimal: required(FieldType.STRING, {
      description: 'Available balance as decimal-safe string',
      example: '100.000000',
    }),
    pending: required(FieldType.NUMBER, {
      description: 'Pending balance',
      example: 0,
    }),
    pendingDecimal: required(FieldType.STRING, {
      description: 'Pending balance as decimal-safe string',
      example: '0.000000',
    }),
    total: required(FieldType.NUMBER, {
      description: 'Total balance (available + pending)',
      example: 100.0,
    }),
    totalDecimal: required(FieldType.STRING, {
      description: 'Total balance as decimal-safe string',
      example: '100.000000',
    }),
  },
};

/**
 * Wallet balance response
 */
export const WalletBalanceResponseSchema: ContractSchema = {
  name: 'WalletBalanceResponse',
  description: 'Response for wallet balance query',
  fields: {
    walletId: required(FieldType.UUID, {
      description: 'Wallet identifier',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    currency: required(FieldType.STRING, {
      description: 'Primary currency',
      example: 'USDC',
    }),
    source: required(FieldType.STRING, {
      description: 'Balance source',
      enum: ['ledger', 'local_mirror'],
      example: 'ledger',
    }),
    sourceOfTruth: required(FieldType.STRING, {
      description: 'Authoritative balance source used by the API',
      enum: ['blnk', 'local_mirror'],
      example: 'blnk',
    }),
    readStatus: required(FieldType.STRING, {
      description: 'Freshness/degradation state for the returned balance',
      enum: ['fresh', 'cached', 'degraded', 'cached_degraded'],
      example: 'fresh',
    }),
    isStale: required(FieldType.BOOLEAN, {
      description: 'Whether the displayed balance may be stale',
      example: false,
    }),
    degraded: required(FieldType.BOOLEAN, {
      description: 'Whether the ledger source is unavailable or degraded',
      example: false,
    }),
    warning: optional(FieldType.STRING, {
      description: 'Mobile-safe warning to show when balance is degraded',
      nullable: true,
      example: null,
    }),
    balances: required(FieldType.ARRAY, {
      description: 'Balances by currency',
      itemType: BalanceItemSchema,
    }),
  },
};

/**
 * Wallet creation response
 */
export const WalletCreateResponseSchema: ContractSchema = {
  name: 'WalletCreateResponse',
  description: 'Response after wallet creation',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Wallet ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    userId: required(FieldType.UUID, {
      description: 'Owner user ID',
      example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    circleWalletId: optional(FieldType.STRING, {
      description: 'Circle wallet ID if applicable',
      example: '55c56c99-63f9-5426-ab08-10d40d196a8f',
    }),
    circleWalletAddress: optional(FieldType.STRING, {
      description: 'Circle wallet address if applicable',
      example: '0x3ca7a6241ee8490dc847b3ee9635b4ecfe9f9bc5',
    }),
    currency: required(FieldType.STRING, {
      description: 'Wallet currency',
      example: 'USDC',
    }),
    balance: required(FieldType.NUMBER, {
      description: 'Current balance',
      example: 0,
    }),
    balanceDecimal: required(FieldType.STRING, {
      description: 'Current balance as decimal-safe string',
      example: '0.000000',
    }),
    status: required(FieldType.STRING, {
      description: 'Wallet status',
      enum: ['active', 'suspended', 'pending'],
      example: 'active',
    }),
  },
};

/**
 * Deposit channel
 */
export const DepositChannelSchema: ContractSchema = {
  name: 'DepositChannel',
  description: 'Available deposit channel',
  fields: {
    id: required(FieldType.STRING, {
      description: 'Channel identifier',
      example: 'orange_money_ci',
    }),
    name: required(FieldType.STRING, {
      description: 'Display name',
      example: 'Orange Money',
    }),
    type: required(FieldType.STRING, {
      description: 'Channel type',
      enum: ['mobile_money', 'bank_transfer', 'card'],
      example: 'mobile_money',
    }),
    provider: required(FieldType.STRING, {
      description: 'Payment provider',
      example: 'orange',
    }),
    country: required(FieldType.STRING, {
      description: 'Country code',
      example: 'CI',
    }),
    minAmount: required(FieldType.NUMBER, {
      description: 'Minimum deposit amount',
      example: 1000,
    }),
    maxAmount: required(FieldType.NUMBER, {
      description: 'Maximum deposit amount',
      example: 500000,
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Fee amount or percentage',
      example: 1.5,
    }),
    feeType: required(FieldType.STRING, {
      description: 'Fee type',
      enum: ['percentage', 'fixed'],
      example: 'percentage',
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency code',
      example: 'XOF',
    }),
  },
};

/**
 * Deposit channels response
 */
export const DepositChannelsResponseSchema: ContractSchema = {
  name: 'DepositChannelsResponse',
  description: 'Available deposit channels',
  fields: {
    channels: required(FieldType.ARRAY, {
      description: 'List of available channels',
      itemType: DepositChannelSchema,
    }),
  },
};

/**
 * Payment instructions for deposit
 */
export const PaymentInstructionsSchema: ContractSchema = {
  name: 'PaymentInstructions',
  description: 'Instructions for completing payment',
  fields: {
    type: required(FieldType.STRING, {
      description: 'Payment type',
      enum: ['mobile_money', 'bank_transfer', 'qr_code'],
      example: 'mobile_money',
    }),
    provider: required(FieldType.STRING, {
      description: 'Payment provider',
      example: 'orange',
    }),
    accountNumber: optional(FieldType.STRING, {
      description: 'Account/phone to send to',
      example: '+2250700000000',
    }),
    reference: required(FieldType.STRING, {
      description: 'Payment reference',
      example: 'DEP-ABC12345',
    }),
    instructions: required(FieldType.STRING, {
      description: 'Human-readable instructions',
      example: 'Send 10000 XOF to the number above...',
    }),
  },
};

/**
 * Deposit initiation response
 */
export const DepositResponseSchema: ContractSchema = {
  name: 'DepositResponse',
  description: 'Response after initiating deposit',
  fields: {
    transactionId: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    depositId: required(FieldType.STRING, {
      description: 'Deposit reference ID',
      example: 'dep_1234567890',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Amount in source currency',
      example: 10000,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Amount in source currency as decimal-safe string',
      example: '10000',
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
      description: 'Exchange rate applied',
      example: 0.00166,
    }),
    rateDecimal: required(FieldType.STRING, {
      description: 'Exchange rate as decimal-safe string',
      example: '0.00166000',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Fee in source currency',
      example: 150,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Fee in source currency as decimal-safe string',
      example: '150',
    }),
    estimatedAmount: required(FieldType.NUMBER, {
      description: 'Estimated amount in target currency',
      example: 16.45,
    }),
    estimatedAmountDecimal: required(FieldType.STRING, {
      description: 'Estimated amount in target currency as decimal-safe string',
      example: '16.45',
    }),
    paymentInstructions: required(FieldType.OBJECT, {
      description: 'Payment instructions',
      nestedSchema: PaymentInstructionsSchema,
    }),
    expiresAt: required(FieldType.DATE, {
      description: 'Expiry time for the deposit',
      example: '2026-01-18T13:00:00.000Z',
    }),
  },
};

/**
 * Internal transfer response
 */
export const InternalTransferResponseSchema: ContractSchema = {
  name: 'InternalTransferResponse',
  description: 'Response after internal transfer',
  fields: {
    transactionId: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    fromWalletId: required(FieldType.STRING, {
      description: 'Source wallet ID',
      example: 'wallet-1',
    }),
    toWalletId: required(FieldType.STRING, {
      description: 'Destination wallet ID',
      example: 'wallet-2',
    }),
    toPhone: required(FieldType.PHONE, {
      description: 'Recipient phone number',
      example: '+2250701234567',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Transfer amount',
      example: 50,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Transfer amount as decimal-safe string',
      example: '50.000000',
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency',
      example: 'USD',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Transfer fee',
      example: 0,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Transfer fee as decimal-safe string',
      example: '0.000000',
    }),
    status: required(FieldType.STRING, {
      description: 'Transfer status',
      enum: ['completed', 'pending', 'failed'],
      example: 'completed',
    }),
  },
};

/**
 * External transfer response
 */
export const ExternalTransferResponseSchema: ContractSchema = {
  name: 'ExternalTransferResponse',
  description: 'Response after external transfer',
  fields: {
    transactionId: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    walletId: required(FieldType.STRING, {
      description: 'Source wallet ID',
      example: 'wallet-1',
    }),
    toAddress: required(FieldType.STRING, {
      description: 'Destination wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Transfer amount',
      example: 50,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Transfer amount as decimal-safe string',
      example: '50.000000',
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency',
      example: 'USD',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Network fee',
      example: 1.0,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Network fee as decimal-safe string',
      example: '1.000000',
    }),
    status: required(FieldType.STRING, {
      description: 'Transfer status',
      enum: ['pending', 'completed', 'failed'],
      example: 'pending',
    }),
    estimatedArrival: optional(FieldType.STRING, {
      description: 'Estimated arrival time',
      example: '5-30 minutes',
    }),
  },
};

/**
 * Withdrawal response
 */
export const WithdrawResponseSchema: ContractSchema = {
  name: 'WithdrawResponse',
  description: 'Response after withdrawal',
  fields: {
    transactionId: required(FieldType.UUID, {
      description: 'Transaction ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Withdrawal amount',
      example: 50.0,
    }),
    amountDecimal: required(FieldType.STRING, {
      description: 'Withdrawal amount as decimal-safe string',
      example: '50.000000',
    }),
    destinationAddress: required(FieldType.STRING, {
      description: 'Destination wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    network: required(FieldType.STRING, {
      description: 'Blockchain network',
      enum: ['polygon', 'base', 'ethereum'],
      example: 'polygon',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Withdrawal fee',
      example: 0.25,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Withdrawal fee as decimal-safe string',
      example: '0.250000',
    }),
    status: required(FieldType.STRING, {
      description: 'Withdrawal status',
      enum: ['pending', 'completed', 'failed'],
      example: 'pending',
    }),
  },
};

/**
 * Exchange rate response
 */
export const RateResponseSchema: ContractSchema = {
  name: 'RateResponse',
  description: 'Exchange rate quote',
  fields: {
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
    sourceAmount: required(FieldType.NUMBER, {
      description: 'Amount in source currency',
      example: 10000,
    }),
    sourceAmountDecimal: required(FieldType.STRING, {
      description: 'Amount in source currency as decimal-safe string',
      example: '10000',
    }),
    targetAmount: required(FieldType.NUMBER, {
      description: 'Amount in target currency',
      example: 16.6,
    }),
    targetAmountDecimal: required(FieldType.STRING, {
      description: 'Amount in target currency as decimal-safe string',
      example: '16.60',
    }),
    fee: required(FieldType.NUMBER, {
      description: 'Fee in source currency',
      example: 150,
    }),
    feeDecimal: required(FieldType.STRING, {
      description: 'Fee in source currency as decimal-safe string',
      example: '150',
    }),
    expiresAt: required(FieldType.DATE, {
      description: 'Rate expiry time',
      example: '2026-01-18T12:05:00.000Z',
    }),
  },
};

/**
 * PIN verification response
 */
export const PinVerifyResponseSchema: ContractSchema = {
  name: 'PinVerifyResponse',
  description: 'Response after PIN verification',
  fields: {
    valid: required(FieldType.BOOLEAN, {
      description: 'Whether PIN is valid',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable message',
      example: 'PIN verified successfully',
    }),
    pinToken: required(FieldType.STRING, {
      description: 'Token for PIN-protected operations',
      example: 'abc123...',
    }),
    expiresIn: required(FieldType.NUMBER, {
      description: 'Token validity in seconds',
      example: 300,
    }),
  },
};

/**
 * PIN set response
 */
export const PinSetResponseSchema: ContractSchema = {
  name: 'PinSetResponse',
  description: 'Response after setting PIN',
  fields: {
    success: required(FieldType.BOOLEAN, {
      description: 'Whether PIN was set successfully',
      example: true,
    }),
    message: required(FieldType.STRING, {
      description: 'Human-readable message',
      example: 'PIN set successfully',
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const InitiateDepositRequestSchema: ContractSchema = {
  name: 'InitiateDepositRequest',
  description: 'Request to initiate deposit',
  fields: {
    amount: required(FieldType.NUMBER, {
      description: 'Amount in source currency',
      example: 10000,
      min: 1,
    }),
    sourceCurrency: required(FieldType.STRING, {
      description: 'Source currency',
      example: 'XOF',
    }),
    channelId: required(FieldType.STRING, {
      description: 'Deposit channel ID',
      example: 'orange_money_ci',
    }),
  },
};

export const InternalTransferRequestSchema: ContractSchema = {
  name: 'InternalTransferRequest',
  description: 'Request for internal transfer',
  fields: {
    toPhone: required(FieldType.PHONE, {
      description: 'Recipient phone number',
      example: '+2250701234567',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Transfer amount',
      example: 50,
      min: 0.01,
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency',
      example: 'USD',
    }),
  },
};

export const ExternalTransferRequestSchema: ContractSchema = {
  name: 'ExternalTransferRequest',
  description: 'Request for external transfer',
  fields: {
    toAddress: required(FieldType.STRING, {
      description: 'Destination wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    amount: required(FieldType.NUMBER, {
      description: 'Transfer amount',
      example: 50,
      min: 0.01,
    }),
    currency: required(FieldType.STRING, {
      description: 'Currency',
      example: 'USD',
    }),
    network: required(FieldType.STRING, {
      description: 'Blockchain network',
      enum: ['polygon', 'base', 'ethereum'],
      example: 'polygon',
    }),
  },
};

export const VerifyPinRequestSchema: ContractSchema = {
  name: 'VerifyPinRequest',
  description: 'Request to verify PIN',
  fields: {
    pin: required(FieldType.STRING, {
      description: 'Hashed PIN',
      example: 'hashed_pin_value',
    }),
  },
};

export const SetPinRequestSchema: ContractSchema = {
  name: 'SetPinRequest',
  description: 'Request to set PIN',
  fields: {
    pin: required(FieldType.STRING, {
      description: 'Hashed PIN',
      example: 'hashed_pin_value',
    }),
    confirmPin: required(FieldType.STRING, {
      description: 'Confirmation of hashed PIN',
      example: 'hashed_pin_value',
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const WalletErrorSchema: ContractSchema = {
  name: 'WalletError',
  description: 'Error response for wallet endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 400,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Insufficient balance',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Bad Request',
    }),
    code: optional(FieldType.STRING, {
      description: 'Error code',
      example: 'INSUFFICIENT_BALANCE',
    }),
  },
};

export const PinErrorSchema: ContractSchema = {
  name: 'PinError',
  description: 'Error response for PIN operations',
  fields: {
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Invalid PIN',
    }),
    remainingAttempts: optional(FieldType.NUMBER, {
      description: 'Remaining PIN attempts',
      example: 3,
    }),
    lockedUntil: optional(FieldType.DATE, {
      description: 'Lock expiry time if locked',
      example: '2026-01-18T13:00:00.000Z',
    }),
    code: optional(FieldType.STRING, {
      description: 'Error code',
      example: 'PIN_REQUIRED',
    }),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const GetBalanceEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet',
  description: 'Get wallet balance',
  auth: 'bearer',
  responses: {
    200: WalletBalanceResponseSchema,
    401: WalletErrorSchema,
  },
  exampleResponse: {
    200: {
      walletId: '123e4567-e89b-12d3-a456-426614174000',
      currency: 'USD',
      balances: [
        { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
      ],
    },
  },
};

export const CreateWalletEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/create',
  description: 'Create/activate wallet',
  auth: 'bearer',
  responses: {
    201: WalletCreateResponseSchema,
    200: WalletCreateResponseSchema, // Already exists
  },
  exampleResponse: {
    201: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      circleWalletId: '55c56c99-63f9-5426-ab08-10d40d196a8f',
      circleWalletAddress: '0x3ca7a6241ee8490dc847b3ee9635b4ecfe9f9bc5',
      currency: 'USDC',
      balance: 0,
      status: 'active',
    },
  },
};

export const GetDepositChannelsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/deposit/channels',
  description: 'Get available deposit channels',
  auth: 'bearer',
  queryParams: {
    name: 'DepositChannelsQuery',
    fields: {
      currency: optional(FieldType.STRING, {
        description: 'Filter by currency',
        example: 'XOF',
      }),
    },
  },
  responses: {
    200: DepositChannelsResponseSchema,
  },
};

export const InitiateDepositEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/deposit',
  description: 'Initiate deposit',
  auth: 'bearer',
  headers: {
    'X-Idempotency-Key': 'UUID for idempotency',
  },
  requestBody: InitiateDepositRequestSchema,
  responses: {
    201: DepositResponseSchema,
    400: WalletErrorSchema,
  },
};

export const InternalTransferEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/transfer/internal',
  description: 'Transfer to another user',
  auth: 'pin-token',
  headers: {
    'X-Idempotency-Key': 'UUID for idempotency',
    'X-Pin-Token': 'PIN verification token',
  },
  requestBody: InternalTransferRequestSchema,
  responses: {
    200: InternalTransferResponseSchema,
    400: PinErrorSchema,
  },
};

export const ExternalTransferEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/transfer/external',
  description: 'Transfer to external wallet',
  auth: 'pin-token',
  headers: {
    'X-Idempotency-Key': 'UUID for idempotency',
    'X-Pin-Token': 'PIN verification token',
  },
  requestBody: ExternalTransferRequestSchema,
  responses: {
    200: ExternalTransferResponseSchema,
    400: PinErrorSchema,
  },
};

export const GetRateEndpoint: EndpointContract = {
  method: 'GET',
  path: '/wallet/rate',
  description: 'Get exchange rate quote',
  auth: 'bearer',
  queryParams: {
    name: 'RateQuery',
    fields: {
      sourceCurrency: required(FieldType.STRING, { example: 'XOF' }),
      targetCurrency: required(FieldType.STRING, { example: 'USD' }),
      amount: required(FieldType.NUMBER, { example: 10000 }),
      direction: optional(FieldType.STRING, { enum: ['buy', 'sell'] }),
    },
  },
  responses: {
    200: RateResponseSchema,
  },
};

export const VerifyPinEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/pin/verify',
  description: 'Verify transaction PIN',
  auth: 'bearer',
  requestBody: VerifyPinRequestSchema,
  responses: {
    200: PinVerifyResponseSchema,
    400: PinErrorSchema,
    403: PinErrorSchema,
  },
};

export const SetPinEndpoint: EndpointContract = {
  method: 'POST',
  path: '/wallet/pin/set',
  description: 'Set transaction PIN',
  auth: 'bearer',
  requestBody: SetPinRequestSchema,
  responses: {
    200: PinSetResponseSchema,
    400: WalletErrorSchema,
  },
};

// ============================================
// Contract Group
// ============================================

export const WalletContractGroup: ContractGroup = {
  name: 'Wallet',
  basePath: '/wallet',
  description: 'Wallet management, transfers, and deposits',
  endpoints: [
    GetBalanceEndpoint,
    CreateWalletEndpoint,
    GetDepositChannelsEndpoint,
    InitiateDepositEndpoint,
    InternalTransferEndpoint,
    ExternalTransferEndpoint,
    GetRateEndpoint,
    VerifyPinEndpoint,
    SetPinEndpoint,
  ],
};
