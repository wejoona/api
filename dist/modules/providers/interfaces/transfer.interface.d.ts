export interface InternalTransferData {
    fromWalletId: string;
    toWalletId: string;
    amount: string;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}
export interface ExternalTransferData {
    fromWalletId: string;
    toAddress: string;
    amount: string;
    currency: string;
    blockchain: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface TransferResult {
    providerId: string;
    status: TransferStatus;
    amount: string;
    currency: string;
    fee: string;
    fromWalletId: string;
    toWalletId?: string;
    toAddress?: string;
    txHash?: string;
    errorCode?: string;
    errorMessage?: string;
    createdAt: Date;
    completedAt?: Date;
}
export interface ITransferProvider {
    readonly providerName: string;
    internalTransfer(data: InternalTransferData): Promise<TransferResult>;
    externalTransfer(data: ExternalTransferData): Promise<TransferResult>;
    getTransferStatus(providerTransferId: string): Promise<TransferResult>;
    estimateFee(data: Partial<ExternalTransferData>): Promise<{
        fee: string;
        currency: string;
    }>;
}
export declare const TRANSFER_PROVIDER: unique symbol;
