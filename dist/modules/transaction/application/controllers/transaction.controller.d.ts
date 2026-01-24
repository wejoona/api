import { AuthenticatedRequest } from '../../../../common/guards';
import { GetTransactionsUseCase, GetTransactionUseCase, GetDepositStatusUseCase } from '../usecases';
export declare class TransactionController {
    private readonly getTransactionsUseCase;
    private readonly getTransactionUseCase;
    private readonly getDepositStatusUseCase;
    constructor(getTransactionsUseCase: GetTransactionsUseCase, getTransactionUseCase: GetTransactionUseCase, getDepositStatusUseCase: GetDepositStatusUseCase);
    getTransactions(req: AuthenticatedRequest, type?: 'deposit' | 'transfer_internal' | 'transfer_external', status?: 'pending' | 'processing' | 'completed' | 'failed', limit?: number, offset?: number): Promise<import("../usecases/get-transactions.use-case").GetTransactionsOutput>;
    getTransaction(req: AuthenticatedRequest, id: string): Promise<import("../../domain/entities/transaction.entity").TransactionEntity>;
    getDepositStatus(req: AuthenticatedRequest, id: string): Promise<import("../usecases/get-deposit-status.use-case").GetDepositStatusOutput>;
}
