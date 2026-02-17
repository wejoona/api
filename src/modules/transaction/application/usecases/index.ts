import { GetTransactionsUseCase } from './get-transactions.use-case';
import { GetTransactionUseCase } from './get-transaction.use-case';
import { GetDepositStatusUseCase } from './get-deposit-status.use-case';
import { ReverseTransactionUseCase } from './reverse-transaction.use-case';

export {
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
  ReverseTransactionUseCase,
};

export const UseCases = [
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
  ReverseTransactionUseCase,
];
