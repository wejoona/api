import { ConfigService } from '@nestjs/config';
import { IWalletProvider, CreateWalletData, ProviderWallet, WalletBalance } from '../../interfaces';
export declare class CircleWalletAdapter implements IWalletProvider {
    private readonly configService;
    private readonly logger;
    private readonly config;
    private readonly defaultBlockchain;
    private readonly circuitBreaker;
    readonly providerName = "circle";
    constructor(configService: ConfigService);
    private secureFetch;
    private handleApiError;
    createWallet(data: CreateWalletData): Promise<ProviderWallet>;
    getWallet(providerWalletId: string): Promise<ProviderWallet | null>;
    getBalance(providerWalletId: string): Promise<WalletBalance[]>;
    getDepositAddress(providerWalletId: string, _blockchain?: string): Promise<string>;
    listWallets(userProviderId: string): Promise<ProviderWallet[]>;
    private mapCircleWallet;
}
