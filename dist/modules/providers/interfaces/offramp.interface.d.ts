export type WithdrawalChannelType = 'mobile_money' | 'bank_transfer' | 'ach' | 'wire';
export interface WithdrawalChannel {
    id: string;
    name: string;
    type: WithdrawalChannelType;
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
export interface BankDetails {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    accountHolderName: string;
    accountType?: 'checking' | 'savings';
}
export interface MobileMoneyDetails {
    provider: string;
    phoneNumber: string;
    accountName?: string;
}
export interface InitiateWithdrawalData {
    userId: string;
    sourceWalletId: string;
    amount: number;
    targetCurrency: string;
    channelId: string;
    destination: BankDetails | MobileMoneyDetails;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'returned';
export interface WithdrawalResult {
    providerId: string;
    status: WithdrawalStatus;
    sourceAmount: number;
    sourceCurrency: string;
    targetAmount: number;
    targetCurrency: string;
    rate: number;
    fee: number;
    destination: BankDetails | MobileMoneyDetails;
    reference: string;
    errorCode?: string;
    errorMessage?: string;
    createdAt: Date;
    estimatedArrival?: Date;
    completedAt?: Date;
}
export interface IOffRampProvider {
    readonly providerName: string;
    readonly supportedCountries: string[];
    getChannels(country: string, currency?: string): Promise<WithdrawalChannel[]>;
    getRate(sourceCurrency: string, targetCurrency: string, amount: number): Promise<{
        rate: number;
        sourceAmount: number;
        targetAmount: number;
        fee: number;
        expiresAt: Date;
    }>;
    initiateWithdrawal(data: InitiateWithdrawalData): Promise<WithdrawalResult>;
    getWithdrawalStatus(providerWithdrawalId: string): Promise<WithdrawalResult>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    parseWebhookEvent(payload: Record<string, unknown>): {
        type: 'withdrawal.pending' | 'withdrawal.completed' | 'withdrawal.failed' | 'withdrawal.returned';
        withdrawalId: string;
        data: Record<string, unknown>;
    };
}
export declare const OFFRAMP_PROVIDER: unique symbol;
export declare const OFFRAMP_PROVIDER_CI: unique symbol;
export declare const OFFRAMP_PROVIDER_US: unique symbol;
