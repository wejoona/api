/**
 * Circle API Types
 * Based on Circle's Programmable Wallets API
 * https://developers.circle.com/w3s/reference
 */

// ============================================
// USER / ENTITY TYPES
// ============================================

export interface CircleCreateUserRequest {
  idempotencyKey: string;
  userId: string; // Your internal user ID
}

export interface CircleUser {
  id: string;
  status: 'ENABLED' | 'DISABLED';
  createDate: string;
  updateDate: string;
}

// ============================================
// WALLET TYPES
// ============================================

export interface CircleCreateWalletRequest {
  idempotencyKey: string;
  userId: string; // Circle user ID
  blockchains: string[]; // ['ETH-SEPOLIA', 'MATIC-AMOY'] for testnet
  metadata?: Array<{
    name: string;
    refId: string;
  }>;
}

export interface CircleWallet {
  id: string;
  state: 'LIVE' | 'FROZEN';
  walletSetId: string;
  custodyType: 'DEVELOPER' | 'USER';
  userId: string;
  address: string;
  blockchain: string;
  accountType: string;
  updateDate: string;
  createDate: string;
}

export interface CircleWalletBalance {
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
  };
  amount: string;
  updateDate: string;
}

// ============================================
// TRANSFER TYPES
// ============================================

export interface CircleCreateTransferRequest {
  idempotencyKey: string;
  userId?: string;
  destinationAddress: string;
  amounts: Array<{
    amount: string;
    tokenId: string;
  }>;
  feeLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  walletId: string;
}

export interface CircleTransfer {
  id: string;
  state:
    | 'INITIATED'
    | 'PENDING_RISK_SCREENING'
    | 'DENIED'
    | 'QUEUED'
    | 'SENT'
    | 'CONFIRMED'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCELLED';
  transactionType: 'INBOUND' | 'OUTBOUND';
  sourceAddress: string;
  destinationAddress: string;
  amounts: Array<{
    amount: string;
    tokenId: string;
  }>;
  feeLevel: string;
  fees?: Array<{
    amount: string;
    tokenId: string;
  }>;
  txHash?: string;
  blockchain: string;
  walletId: string;
  userId: string;
  createDate: string;
  updateDate: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export type CircleWebhookEventType =
  | 'wallets.transfer.complete'
  | 'wallets.transfer.failed'
  | 'wallets.inbound.complete'
  | 'wallets.inbound.failed';

export interface CircleWebhookEvent {
  subscriptionId: string;
  notificationId: string;
  notificationType: CircleWebhookEventType;
  notification: {
    id: string;
    state: string;
    walletId: string;
    userId: string;
    txHash?: string;
    blockchain: string;
    amounts: Array<{
      amount: string;
      tokenId: string;
    }>;
    createDate: string;
    updateDate: string;
  };
}

// ============================================
// API RESPONSE WRAPPER
// ============================================

export interface CircleApiResponse<T> {
  data: T;
}

export interface CircleApiError {
  code: number;
  message: string;
  errors?: Array<{
    error: string;
    message: string;
    location: string;
    invalidValue?: string;
  }>;
}

// ============================================
// CONFIG
// ============================================

export interface CircleConfig {
  apiKey: string;
  entitySecret: string; // For Programmable Wallets
  baseUrl: string; // https://api.circle.com/v1/w3s
  walletSetId?: string; // Default wallet set
  useMock: boolean;
}

// Token IDs for different networks
export const CIRCLE_USDC_TOKENS = {
  // Mainnet
  ETH: 'eth-mainnet-usdc',
  MATIC: 'matic-mainnet-usdc',
  SOL: 'sol-mainnet-usdc',
  // Testnet
  'ETH-SEPOLIA': '36b6931a-873a-56a8-8a27-b706b17104ee',
  'MATIC-AMOY': 'matic-amoy-usdc',
} as const;

export const CIRCLE_BLOCKCHAINS = {
  mainnet: ['ETH', 'MATIC', 'SOL', 'AVAX', 'ARB'],
  testnet: ['ETH-SEPOLIA', 'MATIC-AMOY', 'SOL-DEVNET'],
} as const;
