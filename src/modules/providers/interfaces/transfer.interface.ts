/**
 * Transfer Provider Interface
 *
 * Handles USDC transfers between wallets.
 * Current implementation: Circle
 * Future: Direct blockchain transfers
 */

export interface InternalTransferData {
  fromWalletId: string; // Provider's source wallet ID
  toWalletId: string; // Provider's destination wallet ID
  amount: string; // Amount as string for precision
  currency: string; // 'USDC'
  idempotencyKey: string; // Your transaction ID for idempotency
  metadata?: Record<string, unknown>;
}

export interface ExternalTransferData {
  fromWalletId: string; // Provider's source wallet ID
  toAddress: string; // External blockchain address
  amount: string;
  currency: string;
  blockchain: string; // 'ETH', 'MATIC', 'SOL', etc.
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export type TransferStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TransferResult {
  providerId: string; // Provider's transfer ID
  status: TransferStatus;
  amount: string;
  currency: string;
  fee: string;
  fromWalletId: string;
  toWalletId?: string;
  toAddress?: string;
  txHash?: string; // Blockchain transaction hash
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ITransferProvider {
  readonly providerName: string;

  /**
   * Transfer between wallets within the same provider (instant, free)
   */
  internalTransfer(data: InternalTransferData): Promise<TransferResult>;

  /**
   * Transfer to external blockchain address
   */
  externalTransfer(data: ExternalTransferData): Promise<TransferResult>;

  /**
   * Get transfer status by provider transfer ID
   */
  getTransferStatus(providerTransferId: string): Promise<TransferResult>;

  /**
   * Estimate transfer fee
   */
  estimateFee(
    data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }>;
}

export const TRANSFER_PROVIDER = Symbol('TRANSFER_PROVIDER');
