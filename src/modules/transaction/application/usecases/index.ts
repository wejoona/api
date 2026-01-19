import { GetTransactionsUseCase } from './get-transactions.use-case';
import { GetTransactionUseCase } from './get-transaction.use-case';
import { GetDepositStatusUseCase } from './get-deposit-status.use-case';

export {
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
};

export const UseCases = [
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
];
