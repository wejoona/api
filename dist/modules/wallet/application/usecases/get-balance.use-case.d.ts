import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { IPaymentGateway, Balance } from '../../../shared/domain/gateways';
export interface GetBalanceInput {
    userId: string;
}
export interface GetBalanceOutput {
    walletId: string;
    currency: string;
    balances: Balance[];
}
export declare class GetBalanceUseCase {
    private readonly walletRepository;
    private readonly paymentGateway;
    constructor(walletRepository: WalletRepository, paymentGateway: IPaymentGateway);
    execute(input: GetBalanceInput): Promise<GetBalanceOutput>;
}
