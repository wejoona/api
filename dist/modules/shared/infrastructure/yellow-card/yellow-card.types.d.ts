export interface YellowCardConfig {
    apiUrl: string;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    useMock: boolean;
}
export interface CreateSubwalletRequest {
    name: string;
    email?: string;
    country: string;
    phone?: string;
}
export interface SubwalletResponse {
    id: string;
    name: string;
    email: string | null;
    country: string;
    phone: string | null;
    address: string;
    balance: number;
    currency: string;
    createdAt: string;
}
export interface OnRampChannel {
    id: string;
    name: string;
    type: 'mobile_money' | 'bank_transfer';
    provider: string;
    country: string;
    minAmount: number;
    maxAmount: number;
    fee: number;
    feeType: 'fixed' | 'percentage';
}
export interface InitiateDepositRequest {
    subwalletId: string;
    amount: number;
    sourceCurrency: string;
    channelId: string;
    customerPhone?: string;
}
export interface DepositResponse {
    id: string;
    subwalletId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
    fee: number;
    targetAmount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    paymentInstructions: PaymentInstructions;
    createdAt: string;
    expiresAt: string;
}
export interface PaymentInstructions {
    type: 'mobile_money' | 'bank_transfer';
    provider: string;
    accountNumber?: string;
    accountName?: string;
    reference: string;
    instructions: string;
}
export interface InternalTransferRequest {
    fromSubwalletId: string;
    toSubwalletId: string;
    amount: number;
    currency: string;
    reference?: string;
}
export interface ExternalTransferRequest {
    subwalletId: string;
    toAddress: string;
    amount: number;
    currency: string;
    network: string;
    reference?: string;
}
export interface TransferResponse {
    id: string;
    type: 'internal' | 'external';
    fromSubwalletId: string;
    toSubwalletId?: string;
    toAddress?: string;
    amount: number;
    currency: string;
    fee: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    txHash?: string;
    createdAt: string;
}
export interface BalanceResponse {
    subwalletId: string;
    balances: Balance[];
}
export interface Balance {
    currency: string;
    available: number;
    pending: number;
    total: number;
}
export type WebhookEventType = 'deposit.pending' | 'deposit.completed' | 'deposit.failed' | 'transfer.pending' | 'transfer.completed' | 'transfer.failed' | 'kyc.approved' | 'kyc.rejected';
export interface WebhookPayload {
    id: string;
    type: WebhookEventType;
    data: Record<string, unknown>;
    createdAt: string;
}
export interface SubmitKycRequest {
    subwalletId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    documentType: 'passport' | 'national_id' | 'drivers_license';
    documentNumber: string;
    documentFrontUrl?: string;
    documentBackUrl?: string;
    selfieUrl?: string;
}
export interface KycResponse {
    id: string;
    subwalletId: string;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    createdAt: string;
    updatedAt: string;
}
export interface RateRequest {
    sourceCurrency: string;
    targetCurrency: string;
    amount: number;
}
export interface RateResponse {
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: string;
}
