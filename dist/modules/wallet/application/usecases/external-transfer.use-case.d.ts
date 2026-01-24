import { DataSource } from 'typeorm';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
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
    private readonly dataSource;
    private readonly paymentGateway;
    private readonly logger;
    private readonly FEE_PERCENTAGE;
    private readonly MAX_TRANSFER_AMOUNT;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, dataSource: DataSource, paymentGateway: IPaymentGateway);
    execute(input: ExternalTransferInput): Promise<ExternalTransferOutput>;
    private isValidAddress;
}
