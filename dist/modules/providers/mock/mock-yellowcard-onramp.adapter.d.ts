import { IOnRampProvider, PaymentChannel, InitiateDepositData, DepositResult } from '../interfaces';
export declare class MockYellowCardOnRampAdapter implements IOnRampProvider {
    private readonly logger;
    private readonly channelsMockData;
    private readonly ratesMockData;
    readonly providerName = "yellowcard_mock";
    readonly supportedCountries: string[];
    constructor();
    private loadChannelsMockData;
    private loadRatesMockData;
    getChannels(country: string, _currency?: string): Promise<PaymentChannel[]>;
    getRate(_sourceCurrency: string, _targetCurrency: string, amount: number): Promise<{
        rate: number;
        sourceAmount: number;
        targetAmount: number;
        fee: number;
        expiresAt: Date;
    }>;
    initiateDeposit(data: InitiateDepositData): Promise<DepositResult>;
    getDepositStatus(providerDepositId: string): Promise<DepositResult>;
    verifyWebhookSignature(_payload: string, _signature: string): boolean;
    parseWebhookEvent(payload: Record<string, unknown>): {
        type: 'deposit.pending' | 'deposit.completed' | 'deposit.failed' | 'deposit.expired';
        depositId: string;
        data: Record<string, unknown>;
    };
}
