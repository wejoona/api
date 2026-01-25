import { v4 as uuidv4 } from 'uuid';
import {
  IMerchantPayment,
  MerchantPaymentStatus,
  CreateMerchantPaymentProps,
} from './merchant.types';

/**
 * Merchant Payment Entity
 * Represents a completed payment to a merchant
 */
export class MerchantPaymentEntity implements IMerchantPayment {
  readonly id: string;
  readonly paymentId: string;
  readonly merchantId: string;
  readonly customerId: string;
  readonly customerWalletId: string;
  readonly merchantWalletId: string;
  paymentRequestId?: string;
  readonly amount: number;
  readonly fee: number;
  readonly netAmount: number;
  readonly currency: string;
  readonly reference: string;
  description?: string;
  status: MerchantPaymentStatus;
  txHash?: string;
  ledgerTransactionId?: string;
  refundedAt?: Date;
  refundReason?: string;
  metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IMerchantPayment) {
    this.id = props.id;
    this.paymentId = props.paymentId;
    this.merchantId = props.merchantId;
    this.customerId = props.customerId;
    this.customerWalletId = props.customerWalletId;
    this.merchantWalletId = props.merchantWalletId;
    this.paymentRequestId = props.paymentRequestId;
    this.amount = props.amount;
    this.fee = props.fee;
    this.netAmount = props.netAmount;
    this.currency = props.currency;
    this.reference = props.reference;
    this.description = props.description;
    this.status = props.status;
    this.txHash = props.txHash;
    this.ledgerTransactionId = props.ledgerTransactionId;
    this.refundedAt = props.refundedAt;
    this.refundReason = props.refundReason;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new merchant payment
   */
  static create(props: CreateMerchantPaymentProps): MerchantPaymentEntity {
    const now = new Date();
    const id = uuidv4();
    const paymentId = this.generatePaymentId();
    const reference = this.generateReference();
    const netAmount = props.amount - props.fee;

    return new MerchantPaymentEntity({
      id,
      paymentId,
      merchantId: props.merchantId,
      customerId: props.customerId,
      customerWalletId: props.customerWalletId,
      merchantWalletId: props.merchantWalletId,
      paymentRequestId: props.paymentRequestId,
      amount: props.amount,
      fee: props.fee,
      netAmount,
      currency: props.currency || 'USDC',
      reference,
      description: props.description,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute a merchant payment from persistence
   */
  static reconstitute(props: IMerchantPayment): MerchantPaymentEntity {
    return new MerchantPaymentEntity(props);
  }

  /**
   * Generate a unique payment ID
   * Format: PAY-XXXXXXXX (8 character alphanumeric)
   */
  private static generatePaymentId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PAY-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a unique reference
   * Format: JNPY-YYYYMMDD-XXXXXX
   */
  private static generateReference(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `JNPY-${dateStr}-${suffix}`;
  }

  /**
   * Set the blockchain transaction hash
   */
  setTxHash(txHash: string): void {
    this.txHash = txHash;
    this.updatedAt = new Date();
  }

  /**
   * Set the ledger transaction ID
   */
  setLedgerTransactionId(ledgerTransactionId: string): void {
    this.ledgerTransactionId = ledgerTransactionId;
    this.updatedAt = new Date();
  }

  /**
   * Refund the payment
   */
  refund(reason: string): void {
    if (this.status === 'refunded') {
      throw new Error('Payment has already been refunded');
    }

    if (this.status === 'failed') {
      throw new Error('Cannot refund a failed payment');
    }

    this.status = 'refunded';
    this.refundedAt = new Date();
    this.refundReason = reason;
    this.updatedAt = new Date();
  }

  /**
   * Mark the payment as failed
   */
  markAsFailed(): void {
    if (this.status !== 'completed') {
      throw new Error('Can only mark completed payments as failed');
    }
    this.status = 'failed';
    this.updatedAt = new Date();
  }

  /**
   * Check if the payment is completed
   */
  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if the payment is refunded
   */
  get isRefunded(): boolean {
    return this.status === 'refunded';
  }

  /**
   * Check if the payment is failed
   */
  get isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Check if the payment can be refunded
   */
  get canBeRefunded(): boolean {
    return this.status === 'completed';
  }

  /**
   * Get the gross amount (same as amount, for clarity)
   */
  get grossAmount(): number {
    return this.amount;
  }

  /**
   * Update metadata
   */
  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }
}
