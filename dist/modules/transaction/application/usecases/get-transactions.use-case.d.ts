import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
export interface GetTransactionsInput {
    userId: string;
    type?: 'deposit' | 'transfer_internal' | 'transfer_external';
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    limit?: number;
    offset?: number;
}
export interface GetTransactionsOutput {
    transactions: TransactionEntity[];
    total: number;
    limit: number;
    offset: number;
}
export declare class GetTransactionsUseCase {
    private readonly transactionRepository;
    private readonly walletRepository;
    constructor(transactionRepository: TransactionRepository, walletRepository: WalletRepository);
    execute(input: GetTransactionsInput): Promise<GetTransactionsOutput>;
}
