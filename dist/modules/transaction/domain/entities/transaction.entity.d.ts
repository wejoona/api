export type TransactionType = 'deposit' | 'transfer_internal' | 'transfer_external' | 'withdrawal' | 'bill_payment';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface ITransaction {
    id: string;
    walletId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    status: TransactionStatus;
    yellowCardRef: string | null;
    recipientAddress: string | null;
    recipientPhone: string | null;
    recipientWalletId: string | null;
    metadata: Record<string, unknown> | null;
    failureReason: string | null;
    createdAt: Date;
    completedAt: Date | null;
}
export interface CreateDepositProps {
    walletId: string;
    amount: number;
    currency?: string;
    yellowCardRef?: string;
    metadata?: Record<string, unknown>;
}
export interface CreateInternalTransferProps {
    walletId: string;
    amount: number;
    recipientWalletId: string;
    recipientPhone: string;
    currency?: string;
    metadata?: Record<string, unknown>;
}
export interface CreateExternalTransferProps {
    walletId: string;
    amount: number;
    recipientAddress: string;
    currency?: string;
    yellowCardRef?: string;
    metadata?: Record<string, unknown>;
}
export interface CreateBillPaymentProps {
    walletId: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, unknown>;
}
export declare class TransactionEntity implements ITransaction {
    readonly id: string;
    readonly walletId: string;
    readonly type: TransactionType;
    readonly amount: number;
    readonly currency: string;
    status: TransactionStatus;
    yellowCardRef: string | null;
    readonly recipientAddress: string | null;
    readonly recipientPhone: string | null;
    readonly recipientWalletId: string | null;
    metadata: Record<string, unknown> | null;
    failureReason: string | null;
    readonly createdAt: Date;
    completedAt: Date | null;
    private constructor();
    static createDeposit(props: CreateDepositProps): TransactionEntity;
    static createInternalTransfer(props: CreateInternalTransferProps): TransactionEntity;
    static createExternalTransfer(props: CreateExternalTransferProps): TransactionEntity;
    static createBillPayment(props: CreateBillPaymentProps): TransactionEntity;
    static reconstitute(props: ITransaction): TransactionEntity;
    markProcessing(): void;
    updateStatus(status: TransactionStatus): void;
    complete(): void;
    fail(reason: string): void;
    cancel(): void;
    setYellowCardRef(ref: string): void;
    setProviderRef(ref: string): void;
    get providerRef(): string | null;
    addMetadata(key: string, value: unknown): void;
    get isPending(): boolean;
    get isCompleted(): boolean;
    get isFailed(): boolean;
    get isDeposit(): boolean;
    get isTransfer(): boolean;
    get isBillPayment(): boolean;
}
