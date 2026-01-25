import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
export interface GetTransactionsInput {
    userId: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    sortBy?: 'createdAt' | 'amount';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}
export interface GetTransactionsOutput {
    transactions: TransactionEntity[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
export declare class GetTransactionsUseCase {
    private readonly transactionRepository;
    private readonly walletRepository;
    constructor(transactionRepository: TransactionRepository, walletRepository: WalletRepository);
    execute(input: GetTransactionsInput): Promise<GetTransactionsOutput>;
}
