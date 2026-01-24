import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
export interface DeleteWalletInput {
    walletId: string;
}
export declare class DeleteWalletUseCase {
    private readonly repository;
    constructor(repository: WalletRepository);
    execute(input: DeleteWalletInput): Promise<void>;
}
