import { DataSource } from 'typeorm';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
export interface InternalTransferInput {
    fromUserId: string;
    toPhone: string;
    amount: number;
    currency?: string;
}
export interface InternalTransferOutput {
    transactionId: string;
    fromWalletId: string;
    toWalletId: string;
    toPhone: string;
    amount: number;
    currency: string;
    fee: number;
    status: string;
}
export declare class InternalTransferUseCase {
    private readonly walletRepository;
    private readonly transactionRepository;
    private readonly userRepository;
    private readonly dataSource;
    private readonly paymentGateway;
    private readonly cacheInvalidationService;
    private readonly logger;
    private readonly MAX_RETRIES;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, userRepository: UserRepository, dataSource: DataSource, paymentGateway: IPaymentGateway, cacheInvalidationService: CacheInvalidationService);
    execute(input: InternalTransferInput): Promise<InternalTransferOutput>;
    private validateTransferRequest;
    private validateRecipient;
    private checkDailyLimits;
    private executeTransferTransaction;
    private executeWithRetry;
}
