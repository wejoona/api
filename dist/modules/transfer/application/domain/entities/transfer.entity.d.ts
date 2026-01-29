export type TransferType = 'internal' | 'external';
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export interface ITransfer {
}
export interface CreateInternalTransferProps {
}
export interface CreateExternalTransferProps {
}
export declare class TransferEntity implements ITransfer {
    readonly id: string;
    readonly reference: string;
    readonly type: TransferType;
    status: TransferStatus;
    readonly senderId: string;
    readonly senderWalletId: string;
    readonly senderPhone: string | null;
    readonly recipientId: string | null;
    readonly recipientWalletId: string | null;
    readonly recipientPhone: string | null;
    readonly recipientAddress: string | null;
    readonly recipientBlockchain: string | null;
    readonly amount: number;
    readonly fee: number;
    readonly currency: string;
    readonly note: string | null;
    providerTransferId: string | null;
    providerName: string | null;
    ledgerTransactionId: string | null;
    txHash: string | null;
    errorMessage: string | null;
    metadata: Record<string, unknown> | null;
    readonly createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    private constructor();
    static createInternal(props: CreateInternalTransferProps): TransferEntity;
    static createExternal(props: CreateExternalTransferProps): TransferEntity;
    static reconstitute(props: ITransfer): TransferEntity;
    private static generateReference;
    markProcessing(): void;
    complete(txHash?: string): void;
    fail(errorMessage: string): void;
    cancel(): void;
    refund(): void;
    setProviderInfo(providerTransferId: string, providerName: string): void;
    setLedgerTransactionId(ledgerTransactionId: string): void;
    setTxHash(txHash: string): void;
    addMetadata(key: string, value: unknown): void;
    get isPending(): boolean;
    get isProcessing(): boolean;
    get isCompleted(): boolean;
    get isFailed(): boolean;
    get isCancelled(): boolean;
    get isRefunded(): boolean;
    get isInternal(): boolean;
    get isExternal(): boolean;
    get totalAmount(): number;
    get canBeCancelled(): boolean;
    get canBeRefunded(): boolean;
}
