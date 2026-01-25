import { DataSource } from 'typeorm';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import { TransactionRiskService } from '../../../risk/application/services/transaction-risk.service';
export interface ExternalTransferInput {
    userId: string;
    toAddress: string;
    amount: number;
    currency?: string;
    network?: string;
}
export interface ExternalTransferOutput {
    transactionId: string;
    walletId: string;
    toAddress: string;
    amount: number;
    currency: string;
    fee: number;
    status: string;
    estimatedArrival?: string;
}
export declare class ExternalTransferUseCase {
    private readonly walletRepository;
    private readonly transactionRepository;
    private readonly userRepository;
    private readonly dataSource;
    private readonly paymentGateway;
    private readonly cacheInvalidationService;
    private readonly riskService;
    private readonly logger;
    private readonly FEE_PERCENTAGE;
    private readonly MAX_TRANSFER_AMOUNT;
    private readonly MAX_RETRIES;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, userRepository: UserRepository, dataSource: DataSource, paymentGateway: IPaymentGateway, cacheInvalidationService: CacheInvalidationService, riskService: TransactionRiskService);
    execute(input: ExternalTransferInput): Promise<ExternalTransferOutput>;
    private reserveFunds;
    private finalizeTransaction;
    private refundTransaction;
    private checkTransferLimits;
    private isValidAddress;
    private validateEip55Checksum;
    private screenDestinationAddress;
    private mapNetworkToBlockchain;
}
