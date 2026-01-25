import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentRequest,
  PaymentRequestStatus,
  CreatePaymentRequestProps,
} from './merchant.types';

/**
 * Payment Request Entity
 * Represents a payment request created by a merchant (for dynamic QR codes)
 */
export class PaymentRequestEntity implements IPaymentRequest {
  readonly id: string;
  readonly requestId: string;
  readonly merchantId: string;
  readonly amount: number;
  readonly currency: string;
  description?: string;
  reference?: string;
  readonly expiresAt: Date;
  status: PaymentRequestStatus;
  readonly qrData: string;
  paidAt?: Date;
  paymentId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IPaymentRequest) {
    this.id = props.id;
    this.requestId = props.requestId;
    this.merchantId = props.merchantId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.description = props.description;
    this.reference = props.reference;
    this.expiresAt = props.expiresAt;
    this.status = props.status;
    this.qrData = props.qrData;
    this.paidAt = props.paidAt;
    this.paymentId = props.paymentId;
    this.customerId = props.customerId;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new payment request
   */
  static create(
    props: CreatePaymentRequestProps,
    qrData: string,
  ): PaymentRequestEntity {
    const now = new Date();
    const id = uuidv4();
    const requestId = this.generateRequestId();
    const expiresInMinutes = props.expiresInMinutes || 15; // Default 15 minutes
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    return new PaymentRequestEntity({
      id,
      requestId,
      merchantId: props.merchantId,
      amount: props.amount,
      currency: props.currency || 'USDC',
      description: props.description,
      reference: props.reference,
      expiresAt,
      status: 'pending',
      qrData,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute a payment request from persistence
   */
  static reconstitute(props: IPaymentRequest): PaymentRequestEntity {
    return new PaymentRequestEntity(props);
  }

  /**
   * Generate a unique request ID
   * Format: REQ-XXXXXX (6 character alphanumeric)
   */
  private static generateRequestId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'REQ-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Mark the payment request as paid
   */
  markAsPaid(paymentId: string, customerId: string): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot mark ${this.status} payment request as paid`);
    }

    if (this.isExpired) {
      throw new Error('Payment request has expired');
    }

    this.status = 'paid';
    this.paymentId = paymentId;
    this.customerId = customerId;
    this.paidAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Cancel the payment request
   */
  cancel(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot cancel ${this.status} payment request`);
    }

    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  /**
   * Mark as expired (called by scheduled job or on access)
   */
  markAsExpired(): void {
    if (this.status === 'pending' && this.isExpired) {
      this.status = 'expired';
      this.updatedAt = new Date();
    }
  }

  /**
   * Check if the payment request has expired
   */
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the payment request is still valid for payment
   */
  get isValidForPayment(): boolean {
    return this.status === 'pending' && !this.isExpired;
  }

  /**
   * Get time remaining until expiration in seconds
   */
  get timeRemainingSeconds(): number {
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Check if the request is pending
   */
  get isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if the request is paid
   */
  get isPaid(): boolean {
    return this.status === 'paid';
  }

  /**
   * Check if the request is cancelled
   */
  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  /**
   * Update metadata
   */
  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }
}
