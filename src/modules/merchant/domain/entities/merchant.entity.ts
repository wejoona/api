import { v4 as uuidv4 } from 'uuid';
import {
  IMerchant,
  MerchantCategory,
  MerchantStatus,
  CreateMerchantProps,
} from './merchant.types';

/**
 * Merchant Entity
 * Domain entity representing a business that can accept USDC payments
 */
export class MerchantEntity implements IMerchant {
  readonly id: string;
  businessName: string;
  displayName: string;
  readonly ownerId: string;
  category: MerchantCategory;
  country: string;
  readonly walletId: string;
  qrCode: string;
  qrCodeUrl?: string;
  isVerified: boolean;
  feePercent: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyVolume: number;
  monthlyVolume: number;
  totalTransactions: number;
  status: MerchantStatus;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  logoUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IMerchant) {
    this.id = props.id;
    this.businessName = props.businessName;
    this.displayName = props.displayName;
    this.ownerId = props.ownerId;
    this.category = props.category;
    this.country = props.country;
    this.walletId = props.walletId;
    this.qrCode = props.qrCode;
    this.qrCodeUrl = props.qrCodeUrl;
    this.isVerified = props.isVerified;
    this.feePercent = props.feePercent;
    this.dailyLimit = props.dailyLimit;
    this.monthlyLimit = props.monthlyLimit;
    this.dailyVolume = props.dailyVolume;
    this.monthlyVolume = props.monthlyVolume;
    this.totalTransactions = props.totalTransactions;
    this.status = props.status;
    this.businessAddress = props.businessAddress;
    this.businessPhone = props.businessPhone;
    this.businessEmail = props.businessEmail;
    this.taxId = props.taxId;
    this.logoUrl = props.logoUrl;
    this.webhookUrl = props.webhookUrl;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new merchant entity
   */
  static create(props: CreateMerchantProps): MerchantEntity {
    const now = new Date();
    const id = uuidv4();

    return new MerchantEntity({
      id,
      businessName: props.businessName,
      displayName: props.displayName || props.businessName,
      ownerId: props.ownerId,
      category: props.category,
      country: props.country,
      walletId: props.walletId,
      qrCode: '', // Will be set by QR service
      isVerified: false,
      feePercent: 1.5, // Default 1.5% merchant discount rate
      dailyLimit: 10000, // Default $10,000 daily limit
      monthlyLimit: 100000, // Default $100,000 monthly limit
      dailyVolume: 0,
      monthlyVolume: 0,
      totalTransactions: 0,
      status: 'pending',
      businessAddress: props.businessAddress,
      businessPhone: props.businessPhone,
      businessEmail: props.businessEmail,
      taxId: props.taxId,
      webhookUrl: props.webhookUrl,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute a merchant entity from persistence
   */
  static reconstitute(props: IMerchant): MerchantEntity {
    return new MerchantEntity(props);
  }

  /**
   * Set the static QR code for this merchant
   */
  setQrCode(qrCode: string, qrCodeUrl?: string): void {
    this.qrCode = qrCode;
    if (qrCodeUrl) {
      this.qrCodeUrl = qrCodeUrl;
    }
    this.updatedAt = new Date();
  }

  /**
   * Verify the merchant (after KYB)
   */
  verify(): void {
    this.isVerified = true;
    this.status = 'active';
    this.updatedAt = new Date();
  }

  /**
   * Activate the merchant
   */
  activate(): void {
    if (this.status === 'closed') {
      throw new Error('Cannot activate a closed merchant');
    }
    this.status = 'active';
    this.updatedAt = new Date();
  }

  /**
   * Suspend the merchant
   */
  suspend(): void {
    this.status = 'suspended';
    this.updatedAt = new Date();
  }

  /**
   * Close the merchant account
   */
  close(): void {
    this.status = 'closed';
    this.updatedAt = new Date();
  }

  /**
   * Update business information
   */
  updateBusinessInfo(data: {
    businessName?: string;
    displayName?: string;
    category?: MerchantCategory;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    webhookUrl?: string;
  }): void {
    if (data.businessName) this.businessName = data.businessName;
    if (data.displayName) this.displayName = data.displayName;
    if (data.category) this.category = data.category;
    if (data.businessAddress !== undefined)
      this.businessAddress = data.businessAddress;
    if (data.businessPhone !== undefined)
      this.businessPhone = data.businessPhone;
    if (data.businessEmail !== undefined)
      this.businessEmail = data.businessEmail;
    if (data.webhookUrl !== undefined) this.webhookUrl = data.webhookUrl;
    this.updatedAt = new Date();
  }

  /**
   * Set the merchant's logo URL
   */
  setLogoUrl(logoUrl: string): void {
    this.logoUrl = logoUrl;
    this.updatedAt = new Date();
  }

  /**
   * Update fee percentage
   */
  setFeePercent(feePercent: number): void {
    if (feePercent < 0 || feePercent > 10) {
      throw new Error('Fee percent must be between 0 and 10');
    }
    this.feePercent = feePercent;
    this.updatedAt = new Date();
  }

  /**
   * Update limits
   */
  setLimits(dailyLimit: number, monthlyLimit: number): void {
    if (dailyLimit <= 0 || monthlyLimit <= 0) {
      throw new Error('Limits must be positive');
    }
    if (dailyLimit > monthlyLimit) {
      throw new Error('Daily limit cannot exceed monthly limit');
    }
    this.dailyLimit = dailyLimit;
    this.monthlyLimit = monthlyLimit;
    this.updatedAt = new Date();
  }

  /**
   * Record a payment and update volumes
   */
  recordPayment(amount: number): void {
    this.dailyVolume += amount;
    this.monthlyVolume += amount;
    this.totalTransactions += 1;
    this.updatedAt = new Date();
  }

  /**
   * Reset daily volume (called by scheduled job)
   */
  resetDailyVolume(): void {
    this.dailyVolume = 0;
    this.updatedAt = new Date();
  }

  /**
   * Reset monthly volume (called by scheduled job)
   */
  resetMonthlyVolume(): void {
    this.monthlyVolume = 0;
    this.updatedAt = new Date();
  }

  /**
   * Check if merchant can accept a payment of given amount
   */
  canAcceptPayment(amount: number): {
    allowed: boolean;
    reason?: string;
  } {
    if (this.status !== 'active') {
      return { allowed: false, reason: 'Merchant is not active' };
    }

    if (!this.isVerified) {
      return { allowed: false, reason: 'Merchant is not verified' };
    }

    if (this.dailyVolume + amount > this.dailyLimit) {
      return { allowed: false, reason: 'Daily limit exceeded' };
    }

    if (this.monthlyVolume + amount > this.monthlyLimit) {
      return { allowed: false, reason: 'Monthly limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Calculate fee for a given amount
   */
  calculateFee(amount: number): number {
    return Math.round((amount * this.feePercent) / 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if merchant is active
   */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if merchant is pending verification
   */
  get isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if merchant is suspended
   */
  get isSuspended(): boolean {
    return this.status === 'suspended';
  }

  /**
   * Get remaining daily limit
   */
  get remainingDailyLimit(): number {
    return Math.max(0, this.dailyLimit - this.dailyVolume);
  }

  /**
   * Get remaining monthly limit
   */
  get remainingMonthlyLimit(): number {
    return Math.max(0, this.monthlyLimit - this.monthlyVolume);
  }
}
