import { Cache } from 'cache-manager';
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
    private readonly cacheManager;
    private readonly CACHE_TTL;
    constructor(walletRepository: WalletRepository, paymentGateway: IPaymentGateway, cacheManager: Cache);
    execute(input: GetBalanceInput): Promise<GetBalanceOutput>;
}
