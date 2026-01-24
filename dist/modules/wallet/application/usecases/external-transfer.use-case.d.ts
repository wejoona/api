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
    private readonly paymentGateway;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, paymentGateway: IPaymentGateway);
    execute(input: ExternalTransferInput): Promise<ExternalTransferOutput>;
    private isValidAddress;
}
