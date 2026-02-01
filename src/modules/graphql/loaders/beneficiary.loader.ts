import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { BeneficiaryRepository } from '@/modules/beneficiary/domain/repositories/beneficiary.repository';
import { Beneficiary } from '@/modules/beneficiary/domain/entities/beneficiary.entity';

@Injectable({ scope: Scope.REQUEST })
export class BeneficiaryLoader {
  constructor(private readonly beneficiaryRepository: BeneficiaryRepository) {}

  /**
   * DataLoader for batching beneficiary lookups by ID
   */
  readonly byId = new DataLoader<string, Beneficiary | null>(
    async (ids: readonly string[]) => {
      // Batch load using individual findById calls
      const beneficiaries = await Promise.all(
        ids.map(async (id) => {
          try {
            return await this.beneficiaryRepository.findById(id);
          } catch {
            return null;
          }
        }),
      );

      return beneficiaries;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching beneficiaries by wallet ID
   */
  readonly byWalletId = new DataLoader<string, Beneficiary[]>(
    async (walletIds: readonly string[]) => {
      // Batch load using individual findByWalletId calls
      const beneficiariesByWallet = await Promise.all(
        walletIds.map(async (walletId) => {
          try {
            return await this.beneficiaryRepository.findByWalletId(walletId);
          } catch {
            return [];
          }
        }),
      );

      return beneficiariesByWallet;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching beneficiaries by beneficiary user ID
   * Note: This method cannot be efficiently implemented without repository support
   * Returns empty arrays for all requests until repository method is added
   */
  readonly byBeneficiaryUserId = new DataLoader<string, Beneficiary[]>(
    async (beneficiaryUserIds: readonly string[]) => {
      // TODO: Implement repository method findByBeneficiaryUserIds for efficient batch loading
      // For now, return empty arrays to avoid compilation errors
      return beneficiaryUserIds.map(() => []);
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}
