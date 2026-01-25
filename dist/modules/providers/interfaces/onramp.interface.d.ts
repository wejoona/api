export type PaymentChannelType = 'mobile_money' | 'bank_transfer' | 'bank' | 'card' | 'ach' | 'wire';
export interface PaymentChannel {
    id: string;
    name: string;
    type: PaymentChannelType;
    provider: string;
    country: string;
    currency: string;
    minAmount: number;
    maxAmount: number;
    fee: number;
    feeType: 'fixed' | 'percentage';
    estimatedTime: string;
    isActive: boolean;
}
export interface InitiateDepositData {
    userId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    channelId: string;
    destinationWalletId: string;
    customerPhone?: string;
    customerEmail?: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}
export interface PaymentInstructions {
    type: PaymentChannelType;
    provider: string;
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    reference: string;
    instructions: string;
    qrCode?: string;
    deepLink?: string;
    expiresAt: Date;
}
export type DepositStatus = 'pending' | 'awaiting_payment' | 'processing' | 'completed' | 'failed' | 'expired' | 'refunded';
export interface DepositResult {
    providerId: string;
    status: DepositStatus;
    amount: number;
    sourceCurrency: string;
    targetAmount: number;
    targetCurrency: string;
    rate: number;
    fee: number;
    paymentInstructions: PaymentInstructions;
    createdAt: Date;
    expiresAt: Date;
    completedAt?: Date;
}
export interface IOnRampProvider {
    readonly providerName: string;
    readonly supportedCountries: string[];
    getChannels(country: string, currency?: string): Promise<PaymentChannel[]>;
    getRate(sourceCurrency: string, targetCurrency: string, amount: number): Promise<{
        rate: number;
        sourceAmount: number;
        targetAmount: number;
        fee: number;
        expiresAt: Date;
    }>;
    initiateDeposit(data: InitiateDepositData): Promise<DepositResult>;
    getDepositStatus(providerDepositId: string): Promise<DepositResult>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    parseWebhookEvent(payload: Record<string, unknown>): {
        type: 'deposit.pending' | 'deposit.completed' | 'deposit.failed' | 'deposit.expired' | 'withdrawal.pending' | 'withdrawal.completed' | 'withdrawal.failed';
        depositId: string;
        data: Record<string, unknown>;
    };
}
export declare const ONRAMP_PROVIDER: unique symbol;
export declare const ONRAMP_PROVIDER_CI: unique symbol;
export declare const ONRAMP_PROVIDER_US: unique symbol;
