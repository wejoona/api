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
   */
  readonly byBeneficiaryUserId = new DataLoader<string, Beneficiary[]>(
    async (beneficiaryUserIds: readonly string[]) => {
      const beneficiaries =
        await this.beneficiaryRepository.findByBeneficiaryUserIds(
          beneficiaryUserIds as string[],
        );

      // Group by beneficiary user ID
      const grouped = new Map<string, Beneficiary[]>();
      for (const id of beneficiaryUserIds) {
        grouped.set(id, []);
      }
      for (const b of beneficiaries) {
        const userId = (b as any).beneficiaryUserId;
        if (userId) {
          const existing = grouped.get(userId);
          if (existing) {
            existing.push(b);
          }
        }
      }

      return beneficiaryUserIds.map((id) => grouped.get(id) || []);
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}
