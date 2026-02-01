import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { TransactionRepository } from '@/modules/transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '@/modules/transaction/domain/entities/transaction.entity';

@Injectable({ scope: Scope.REQUEST })
export class TransactionLoader {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  /**
   * DataLoader for batching transaction lookups by ID
   */
  readonly byId = new DataLoader<string, TransactionEntity | null>(
    async (ids: readonly string[]) => {
      // Use existing findByIds method from transaction repository
      const transactions = await this.transactionRepository.findByIds(
        ids as string[],
      );
      const transactionMap = new Map(
        transactions.map((transaction) => [transaction.id, transaction]),
      );

      return ids.map((id) => transactionMap.get(id) || null);
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching transactions by wallet ID
   */
  readonly byWalletId = new DataLoader<string, TransactionEntity[]>(
    async (walletIds: readonly string[]) => {
      // Batch load using individual findByWalletId calls
      const transactionsByWallet = await Promise.all(
        walletIds.map(async (walletId) => {
          try {
            return await this.transactionRepository.findByWalletId(walletId);
          } catch {
            return [];
          }
        }),
      );

      return transactionsByWallet;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching transactions by recipient wallet ID
   * Note: This method cannot be efficiently implemented without repository support
   * Returns empty arrays for all requests until repository method is added
   */
  readonly byRecipientWalletId = new DataLoader<string, TransactionEntity[]>(
    async (recipientWalletIds: readonly string[]) => {
      // TODO: Implement repository method findByRecipientWalletIds for efficient batch loading
      // For now, return empty arrays to avoid compilation errors
      return recipientWalletIds.map(() => []);
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}
