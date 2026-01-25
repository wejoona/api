import { MerchantPaymentEntity } from '../entities/merchant-payment.entity';
import { IMerchantAnalytics } from '../entities/merchant.types';

/**
 * Merchant Payment Repository Interface
 * Defines the contract for merchant payment data persistence
 */
export interface IMerchantPaymentRepository {
  /**
   * Find a merchant payment by ID
   */
  findById(id: string): Promise<MerchantPaymentEntity | null>;

  /**
   * Find a merchant payment by payment ID
   */
  findByPaymentId(paymentId: string): Promise<MerchantPaymentEntity | null>;

  /**
   * Find a merchant payment by reference
   */
  findByReference(reference: string): Promise<MerchantPaymentEntity | null>;

  /**
   * Find all payments for a merchant
   */
  findByMerchantId(
    merchantId: string,
    limit?: number,
    offset?: number,
  ): Promise<MerchantPaymentEntity[]>;

  /**
   * Find all payments by a customer
   */
  findByCustomerId(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<MerchantPaymentEntity[]>;

  /**
   * Find payments by merchant within a date range
   */
  findByMerchantIdAndDateRange(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number,
  ): Promise<MerchantPaymentEntity[]>;

  /**
   * Save a merchant payment
   */
  save(payment: MerchantPaymentEntity): Promise<MerchantPaymentEntity>;

  /**
   * Count payments by merchant
   */
  countByMerchantId(merchantId: string): Promise<number>;

  /**
   * Count payments by customer
   */
  countByCustomerId(customerId: string): Promise<number>;

  /**
   * Get total volume for a merchant within a date range
   */
  getTotalVolumeByMerchantId(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;

  /**
   * Get analytics for a merchant
   */
  getAnalytics(
    merchantId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    endDate: Date,
  ): Promise<IMerchantAnalytics>;

  /**
   * Get unique customer count for a merchant
   */
  getUniqueCustomerCount(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;
}

export const MERCHANT_PAYMENT_REPOSITORY = 'MERCHANT_PAYMENT_REPOSITORY';
