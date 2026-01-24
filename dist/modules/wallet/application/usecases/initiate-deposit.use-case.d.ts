import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { IPaymentGateway, PaymentInstructions } from '../../../shared/domain/gateways';
export interface InitiateDepositInput {
    userId: string;
    amount: number;
    sourceCurrency: string;
    channelId: string;
}
export interface InitiateDepositOutput {
    transactionId: string;
    depositId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
    fee: number;
    estimatedAmount: number;
    paymentInstructions: PaymentInstructions;
    expiresAt: Date;
}
export declare class InitiateDepositUseCase {
    private readonly walletRepository;
    private readonly transactionRepository;
    private readonly paymentGateway;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, paymentGateway: IPaymentGateway);
    execute(input: InitiateDepositInput): Promise<InitiateDepositOutput>;
}
