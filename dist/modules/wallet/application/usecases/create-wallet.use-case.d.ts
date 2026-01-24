import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
export interface CreateWalletInput {
    userId: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    countryCode?: string;
}
export declare class CreateWalletUseCase {
    private readonly repository;
    private readonly paymentGateway;
    constructor(repository: WalletRepository, paymentGateway: IPaymentGateway);
    execute(input: CreateWalletInput): Promise<WalletEntity>;
}
