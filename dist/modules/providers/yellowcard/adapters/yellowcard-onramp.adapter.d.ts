import { ConfigService } from '@nestjs/config';
import { IOnRampProvider, PaymentChannel, InitiateDepositData, DepositResult } from '../../interfaces';
export declare class YellowCardOnRampAdapter implements IOnRampProvider {
    private readonly configService;
    private readonly logger;
    private readonly config;
    readonly providerName = "yellowcard";
    readonly supportedCountries: string[];
    constructor(configService: ConfigService);
    getChannels(country: string, _currency?: string): Promise<PaymentChannel[]>;
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
        type: 'deposit.pending' | 'deposit.completed' | 'deposit.failed' | 'deposit.expired';
        depositId: string;
        data: Record<string, unknown>;
    };
    private mapPaymentToDeposit;
}
