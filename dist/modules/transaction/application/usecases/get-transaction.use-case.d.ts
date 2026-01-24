import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
export interface GetTransactionInput {
    userId: string;
    transactionId: string;
}
export declare class GetTransactionUseCase {
    private readonly transactionRepository;
    private readonly walletRepository;
    constructor(transactionRepository: TransactionRepository, walletRepository: WalletRepository);
    execute(input: GetTransactionInput): Promise<TransactionEntity>;
}
