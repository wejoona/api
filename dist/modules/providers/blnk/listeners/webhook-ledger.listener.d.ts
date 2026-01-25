import { BlnkLedgerAdapter } from '../adapters/blnk-ledger.adapter';
interface WebhookDepositCompletedPayload {
    userId: string;
    walletId: string;
    amount: string;
    fee?: string;
    currency: string;
    externalId: string;
    provider: 'yellowcard' | 'circle';
}
interface WebhookTransferCompletedPayload {
    transferId: string;
    provider: 'circle';
    txHash?: string;
}
interface WebhookTransferFailedPayload {
    transferId: string;
    provider: 'circle';
    errorCode?: string;
    errorMessage: string;
}
interface WebhookWithdrawalCompletedPayload {
    userId: string;
    walletId: string;
    withdrawalId: string;
    amount: string;
    reference: string;
    provider: 'yellowcard' | 'circle';
    data?: Record<string, unknown>;
}
interface WebhookWithdrawalFailedPayload {
    userId: string;
    walletId: string;
    withdrawalId: string;
    amount: string;
    reference: string;
    provider: 'yellowcard' | 'circle';
    reason: string;
}
interface DepositCompletedPayload {
    userId: string;
    amount: string;
    currency: string;
    reference: string;
}
interface DepositFailedPayload {
    userId: string;
    amount: string;
    currency: string;
    reference: string;
    error: string;
}
export declare class WebhookLedgerListener {
    private readonly blnkLedgerAdapter;
    private readonly logger;
    constructor(blnkLedgerAdapter: BlnkLedgerAdapter);
    handleDepositCompleted(payload: WebhookDepositCompletedPayload): Promise<void>;
    handleTransferCompleted(payload: WebhookTransferCompletedPayload): Promise<void>;
    handleTransferFailed(payload: WebhookTransferFailedPayload): Promise<void>;
    handleDepositCompletedNotification(payload: DepositCompletedPayload): Promise<void>;
    handleDepositFailedNotification(payload: DepositFailedPayload): Promise<void>;
    handleWithdrawalCompleted(payload: WebhookWithdrawalCompletedPayload): Promise<void>;
    handleWithdrawalFailed(payload: WebhookWithdrawalFailedPayload): Promise<void>;
}
export {};
