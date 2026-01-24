import { ConfigService } from '@nestjs/config';
import { IOffRampProvider, WithdrawalChannel, InitiateWithdrawalData, WithdrawalResult } from '../../interfaces';
export declare class YellowCardOffRampAdapter implements IOffRampProvider {
    private readonly configService;
    private readonly logger;
    private readonly config;
    readonly providerName = "yellowcard";
    readonly supportedCountries: string[];
    constructor(configService: ConfigService);
    getChannels(country: string, _currency?: string): Promise<WithdrawalChannel[]>;
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
    private mapPayoutToWithdrawal;
}
