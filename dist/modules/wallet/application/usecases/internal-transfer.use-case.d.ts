import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { IPaymentGateway } from '../../../shared/domain/gateways';
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
    private readonly paymentGateway;
    constructor(walletRepository: WalletRepository, transactionRepository: TransactionRepository, userRepository: UserRepository, paymentGateway: IPaymentGateway);
    execute(input: InternalTransferInput): Promise<InternalTransferOutput>;
}
