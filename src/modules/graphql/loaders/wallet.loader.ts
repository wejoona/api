import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { IWalletRepository } from '@/modules/wallet/domain/repositories/wallet.repository';
import { WalletEntity } from '@/modules/wallet/domain/entities/wallet.entity';
import { WalletRepository } from '@/modules/wallet/infrastructure/repositories/wallet.repository';

@Injectable({ scope: Scope.REQUEST })
export class WalletLoader {
  constructor(private readonly walletRepository: WalletRepository) {}

  /**
   * DataLoader for batching wallet lookups by ID
   */
  readonly byId = new DataLoader<string, WalletEntity | null>(
    async (ids: readonly string[]) => {
      // Batch load using individual findById calls
      const wallets = await Promise.all(
        ids.map(async (id) => {
          try {
            return await this.walletRepository.findById(id);
          } catch {
            return null;
          }
        }),
      );

      return wallets;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching wallet lookups by user ID
   */
  readonly byUserId = new DataLoader<string, WalletEntity | null>(
    async (userIds: readonly string[]) => {
      // Batch load using individual findByUserId calls
      const wallets = await Promise.all(
        userIds.map(async (userId) => {
          try {
            return await this.walletRepository.findByUserId(userId);
          } catch {
            return null;
          }
        }),
      );

      return wallets;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching wallet lookups by Circle wallet ID
   */
  readonly byCircleWalletId = new DataLoader<string, WalletEntity | null>(
    async (circleWalletIds: readonly string[]) => {
      // Batch load using individual findByCircleWalletId calls
      const wallets = await Promise.all(
        circleWalletIds.map(async (circleWalletId) => {
          try {
            return await this.walletRepository.findByCircleWalletId(
              circleWalletId,
            );
          } catch {
            return null;
          }
        }),
      );

      return wallets;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}
