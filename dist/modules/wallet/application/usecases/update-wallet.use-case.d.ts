import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
export interface UpdateWalletInput {
    walletId: string;
    status?: 'active' | 'suspended';
}
export declare class UpdateWalletUseCase {
    private readonly repository;
    constructor(repository: WalletRepository);
    execute(input: UpdateWalletInput): Promise<WalletEntity>;
}
