import { AuthenticatedRequest } from '../../../../common/guards';
import { GetTransactionsUseCase, GetTransactionUseCase, GetDepositStatusUseCase } from '../usecases';
import { GetTransactionsQueryDto } from '../dto/requests';
export declare class TransactionController {
    private readonly getTransactionsUseCase;
    private readonly getTransactionUseCase;
    private readonly getDepositStatusUseCase;
    constructor(getTransactionsUseCase: GetTransactionsUseCase, getTransactionUseCase: GetTransactionUseCase, getDepositStatusUseCase: GetDepositStatusUseCase);
    getTransactions(req: AuthenticatedRequest, query: GetTransactionsQueryDto): Promise<import("../usecases/get-transactions.use-case").GetTransactionsOutput>;
    getTransaction(req: AuthenticatedRequest, id: string): Promise<import("../../domain/entities/transaction.entity").TransactionEntity>;
    getDepositStatus(req: AuthenticatedRequest, id: string): Promise<import("../usecases/get-deposit-status.use-case").GetDepositStatusOutput>;
}
