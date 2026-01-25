import { PaymentRequestEntity } from '../entities/payment-request.entity';

/**
 * Payment Request Repository Interface
 * Defines the contract for payment request data persistence
 */
export interface IPaymentRequestRepository {
  /**
   * Find a payment request by ID
   */
  findById(id: string): Promise<PaymentRequestEntity | null>;

  /**
   * Find a payment request by request ID
   */
  findByRequestId(requestId: string): Promise<PaymentRequestEntity | null>;

  /**
   * Find all payment requests for a merchant
   */
  findByMerchantId(
    merchantId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaymentRequestEntity[]>;

  /**
   * Find pending payment requests for a merchant
   */
  findPendingByMerchantId(
    merchantId: string,
    limit?: number,
  ): Promise<PaymentRequestEntity[]>;

  /**
   * Find expired pending payment requests
   */
  findExpiredPending(): Promise<PaymentRequestEntity[]>;

  /**
   * Save a payment request
   */
  save(paymentRequest: PaymentRequestEntity): Promise<PaymentRequestEntity>;

  /**
   * Delete a payment request
   */
  delete(id: string): Promise<void>;

  /**
   * Count payment requests by merchant
   */
  countByMerchantId(merchantId: string): Promise<number>;

  /**
   * Mark expired payment requests as expired
   */
  markExpiredRequests(): Promise<number>;
}

export const PAYMENT_REQUEST_REPOSITORY = 'PAYMENT_REQUEST_REPOSITORY';
