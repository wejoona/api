export interface CreateWalletData {
    userId: string;
    userProviderId: string;
    name?: string;
    metadata?: Record<string, unknown>;
}
export interface WalletBalance {
    currency: string;
    available: string;
    pending: string;
    total: string;
}
export interface ProviderWallet {
    providerId: string;
    address: string;
    blockchain: string;
    balances: WalletBalance[];
    status: 'active' | 'frozen' | 'closed';
    createdAt: Date;
}
export interface IWalletProvider {
    readonly providerName: string;
    createWallet(data: CreateWalletData): Promise<ProviderWallet>;
    getWallet(providerWalletId: string): Promise<ProviderWallet | null>;
    getBalance(providerWalletId: string): Promise<WalletBalance[]>;
    getDepositAddress(providerWalletId: string, blockchain?: string): Promise<string>;
    listWallets(userProviderId: string): Promise<ProviderWallet[]>;
}
export declare const WALLET_PROVIDER: unique symbol;
