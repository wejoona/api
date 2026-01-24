import { WalletEntity } from '../entities/wallet.entity';
export interface IWalletRepository {
    save(wallet: WalletEntity): Promise<WalletEntity>;
    findById(id: string): Promise<WalletEntity | null>;
    findByUserId(userId: string): Promise<WalletEntity | null>;
    findByProviderWalletId(providerWalletId: string): Promise<WalletEntity | null>;
    findAll(): Promise<WalletEntity[]>;
    delete(id: string): Promise<void>;
}
export declare const WALLET_REPOSITORY: unique symbol;
