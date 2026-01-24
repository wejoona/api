import { IWalletProvider, CreateWalletData, ProviderWallet, WalletBalance } from '../interfaces';
export declare class MockCircleWalletAdapter implements IWalletProvider {
    private readonly logger;
    private readonly mockData;
    readonly providerName = "circle_mock";
    constructor();
    private loadMockData;
    createWallet(data: CreateWalletData): Promise<ProviderWallet>;
    getWallet(providerWalletId: string): Promise<ProviderWallet | null>;
    getBalance(_providerWalletId: string): Promise<WalletBalance[]>;
    getDepositAddress(providerWalletId: string, _blockchain?: string): Promise<string>;
    listWallets(userProviderId: string): Promise<ProviderWallet[]>;
    private generateMockAddress;
}
