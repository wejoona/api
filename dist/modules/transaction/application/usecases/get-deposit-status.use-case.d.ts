import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
export interface GetDepositStatusInput {
    userId: string;
    transactionId: string;
}
export interface GetDepositStatusOutput {
    transactionId: string;
    depositId: string;
    status: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
    fee: number;
    createdAt: Date;
    completedAt: Date | null;
}
export declare class GetDepositStatusUseCase {
    private readonly transactionRepository;
    private readonly walletRepository;
    private readonly paymentGateway;
    constructor(transactionRepository: TransactionRepository, walletRepository: WalletRepository, paymentGateway: IPaymentGateway);
    execute(input: GetDepositStatusInput): Promise<GetDepositStatusOutput>;
    private mapProviderStatus;
}
