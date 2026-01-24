import { IOffRampProvider, WithdrawalChannel, InitiateWithdrawalData, WithdrawalResult } from '../interfaces';
export declare class MockYellowCardOffRampAdapter implements IOffRampProvider {
    private readonly logger;
    private readonly channelsMockData;
    private readonly ratesMockData;
    readonly providerName = "yellowcard_mock";
    readonly supportedCountries: string[];
    constructor();
    private loadChannelsMockData;
    private loadRatesMockData;
    getChannels(country: string, _currency?: string): Promise<WithdrawalChannel[]>;
    getRate(_sourceCurrency: string, _targetCurrency: string, amount: number): Promise<{
        rate: number;
        sourceAmount: number;
        targetAmount: number;
        fee: number;
        expiresAt: Date;
    }>;
    initiateWithdrawal(data: InitiateWithdrawalData): Promise<WithdrawalResult>;
    getWithdrawalStatus(providerWithdrawalId: string): Promise<WithdrawalResult>;
    verifyWebhookSignature(_payload: string, _signature: string): boolean;
    parseWebhookEvent(payload: Record<string, unknown>): {
        type: 'withdrawal.pending' | 'withdrawal.completed' | 'withdrawal.failed' | 'withdrawal.returned';
        withdrawalId: string;
        data: Record<string, unknown>;
    };
}
