import { MerchantEntity } from '../entities/merchant.entity';

/**
 * Merchant Repository Interface
 * Defines the contract for merchant data persistence
 */
export interface IMerchantRepository {
  /**
   * Find a merchant by ID
   */
  findById(id: string): Promise<MerchantEntity | null>;

  /**
   * Find a merchant by owner ID
   */
  findByOwnerId(ownerId: string): Promise<MerchantEntity | null>;

  /**
   * Find a merchant by wallet ID
   */
  findByWalletId(walletId: string): Promise<MerchantEntity | null>;

  /**
   * Find all merchants for an owner
   */
  findAllByOwnerId(ownerId: string): Promise<MerchantEntity[]>;

  /**
   * Find merchants by status
   */
  findByStatus(
    status: string,
    limit?: number,
    offset?: number,
  ): Promise<MerchantEntity[]>;

  /**
   * Save a merchant
   */
  save(merchant: MerchantEntity): Promise<MerchantEntity>;

  /**
   * Delete a merchant
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a business name exists
   */
  existsByBusinessName(businessName: string, excludeId?: string): Promise<boolean>;

  /**
   * Count merchants by owner
   */
  countByOwnerId(ownerId: string): Promise<number>;

  /**
   * Reset daily volumes for all merchants
   */
  resetAllDailyVolumes(): Promise<void>;

  /**
   * Reset monthly volumes for all merchants
   */
  resetAllMonthlyVolumes(): Promise<void>;
}

export const MERCHANT_REPOSITORY = 'MERCHANT_REPOSITORY';
