import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { IIdentityProvider, IWalletProvider, ILedgerProvider } from '../../../providers/interfaces';
export interface CreateWalletInput {
    userId: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    countryCode?: string;
}
export declare class CreateWalletUseCase {
    private readonly repository;
    private readonly identityProvider;
    private readonly walletProvider;
    private readonly ledgerProvider;
    private readonly logger;
    constructor(repository: WalletRepository, identityProvider: IIdentityProvider, walletProvider: IWalletProvider, ledgerProvider: ILedgerProvider);
    execute(input: CreateWalletInput): Promise<WalletEntity>;
}
