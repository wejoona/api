export type TransactionType = 'deposit' | 'transfer_internal' | 'transfer_external' | 'withdrawal' | 'bill_payment';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface ITransaction {
}
export interface CreateDepositProps {
}
export interface CreateInternalTransferProps {
}
export interface CreateExternalTransferProps {
}
export interface CreateBillPaymentProps {
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
    static createInternalTransfer(props: any, : any, CreateInternalTransferProps: any): TransactionEntity;
    static createExternalTransfer(props: any, : any, CreateExternalTransferProps: any): TransactionEntity;
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
