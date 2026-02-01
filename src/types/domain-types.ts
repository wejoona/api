/**
 * Domain-specific Type Definitions
 *
 * Strict types for JoonaPay business domain entities and value objects
 */

import {
  UserId,
  WalletId,
  TransactionId,
  TransferId,
  UUID,
  ISODateString,
  Email,
  PhoneNumber,
  USDCAmount,
  XOFAmount,
  PositiveInt,
  BaseEntity,
  AuditableEntity,
} from './strict-types';

// ==========================================
// USER DOMAIN
// ==========================================

/**
 * User role types
 */
export type UserRole =
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'support'
  | 'compliance';

/**
 * User status
 */
export type UserStatus =
  | 'active'
  | 'suspended'
  | 'deactivated'
  | 'pending_verification'
  | 'locked';

/**
 * User entity
 */
export interface User {
  readonly id: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt?: ISODateString | null;
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
  readonly email: Email;
  readonly phoneNumber: PhoneNumber;
  readonly firstName: string;
  readonly lastName: string;
  readonly username?: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly pinHash?: string;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly kycStatus: KycStatus;
  readonly kycTier: KycTier;
  readonly referralCode?: string;
  readonly referredBy?: UserId;
  readonly lastLoginAt?: ISODateString;
  readonly metadata?: UserMetadata;
}

/**
 * User metadata
 */
export interface UserMetadata {
  readonly deviceIds?: readonly string[];
  readonly preferredLanguage?: 'fr' | 'en';
  readonly preferredCurrency?: 'USDC' | 'XOF';
  readonly timezone?: string;
  readonly country?: string;
  readonly city?: string;
}

// ==========================================
// KYC DOMAIN
// ==========================================

/**
 * KYC status
 */
export type KycStatus =
  | 'not_started'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'requires_update';

/**
 * KYC tier level
 */
export type KycTier = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3';

/**
 * KYC document type
 */
export type KycDocumentType =
  | 'national_id'
  | 'passport'
  | 'drivers_license'
  | 'residence_permit'
  | 'proof_of_address'
  | 'selfie';

/**
 * KYC verification entity
 */
export interface KycVerification extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly tier: KycTier;
  readonly status: KycStatus;
  readonly documentType?: KycDocumentType;
  readonly documentNumber?: string;
  readonly expiryDate?: ISODateString;
  readonly submittedAt: ISODateString;
  readonly reviewedAt?: ISODateString;
  readonly reviewedBy?: UserId;
  readonly rejectionReason?: string;
  readonly verificationProvider?: 'manual' | 'onfido' | 'jumio';
  readonly verificationScore?: number;
}

/**
 * KYC limits by tier
 */
export interface KycTierLimits {
  readonly tier: KycTier;
  readonly dailyTransactionLimit: USDCAmount;
  readonly monthlyTransactionLimit: USDCAmount;
  readonly singleTransactionLimit: USDCAmount;
  readonly maxWalletBalance: USDCAmount;
  readonly requiresDocuments: readonly KycDocumentType[];
}

// ==========================================
// WALLET DOMAIN
// ==========================================

/**
 * Wallet status
 */
export type WalletStatus = 'active' | 'frozen' | 'closed';

/**
 * Wallet type
 */
export type WalletType = 'custodial' | 'non_custodial';

/**
 * Currency type
 */
export type Currency = 'USDC' | 'XOF';

/**
 * Blockchain network
 */
export type BlockchainNetwork =
  | 'ethereum'
  | 'polygon'
  | 'solana'
  | 'avalanche'
  | 'arbitrum'
  | 'eth-sepolia'
  | 'matic-amoy';

/**
 * Wallet entity
 */
export interface Wallet {
  readonly id: WalletId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt?: ISODateString | null;
  readonly version: PositiveInt;
  readonly userId: UserId;
  readonly status: WalletStatus;
  readonly type: WalletType;
  readonly address?: string;
  readonly blockchain?: BlockchainNetwork;
  readonly balanceUSDC: USDCAmount;
  readonly availableBalance: USDCAmount;
  readonly pendingBalance: USDCAmount;
  readonly frozenBalance: USDCAmount;
  readonly blnkBalanceId?: string;
  readonly circleWalletId?: string;
  readonly lastBalanceUpdate?: ISODateString;
}

/**
 * Balance snapshot
 */
export interface BalanceSnapshot {
  readonly walletId: WalletId;
  readonly timestamp: ISODateString;
  readonly balance: USDCAmount;
  readonly availableBalance: USDCAmount;
  readonly pendingBalance: USDCAmount;
  readonly currency: Currency;
}

// ==========================================
// TRANSACTION DOMAIN
// ==========================================

/**
 * Transaction status
 */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reversed'
  | 'expired';

/**
 * Transaction type
 */
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_internal'
  | 'transfer_external'
  | 'payment'
  | 'refund'
  | 'fee'
  | 'adjustment';

/**
 * Payment method
 */
export type PaymentMethod =
  | 'mobile_money'
  | 'bank_transfer'
  | 'card'
  | 'crypto'
  | 'cash';

/**
 * Mobile money provider
 */
export type MobileMoneyProvider =
  | 'orange_money'
  | 'mtn_momo'
  | 'wave'
  | 'moov_money';

/**
 * Transaction entity
 */
export interface Transaction {
  readonly id: TransactionId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt?: ISODateString | null;
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
  readonly type: TransactionType;
  readonly status: TransactionStatus;
  readonly sourceWalletId?: WalletId;
  readonly destinationWalletId?: WalletId;
  readonly sourceUserId?: UserId;
  readonly destinationUserId?: UserId;
  readonly amount: USDCAmount;
  readonly fee: USDCAmount;
  readonly netAmount: USDCAmount;
  readonly currency: Currency;
  readonly reference: string;
  readonly externalReference?: string;
  readonly description?: string;
  readonly metadata?: TransactionMetadata;
  readonly processedAt?: ISODateString;
  readonly failureReason?: string;
  readonly reversedAt?: ISODateString;
  readonly reversalTransactionId?: TransactionId;
}

/**
 * Transaction metadata
 */
export interface TransactionMetadata {
  readonly paymentMethod?: PaymentMethod;
  readonly provider?: string;
  readonly deviceId?: string;
  readonly ipAddress?: string;
  readonly location?: GeoLocation;
  readonly riskScore?: number;
  readonly notes?: string;
}

/**
 * Geo location
 */
export interface GeoLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly country?: string;
  readonly city?: string;
  readonly accuracy?: number;
}

// ==========================================
// TRANSFER DOMAIN
// ==========================================

/**
 * Transfer status
 */
export type TransferStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Transfer entity
 */
export interface Transfer {
  readonly id: TransferId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt?: ISODateString | null;
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
  readonly type: 'internal' | 'external';
  readonly status: TransferStatus;
  readonly senderId: UserId;
  readonly recipientId?: UserId;
  readonly recipientAddress?: string;
  readonly amount: USDCAmount;
  readonly fee: USDCAmount;
  readonly currency: Currency;
  readonly note?: string;
  readonly reference: string;
  readonly transactionId?: TransactionId;
  readonly blockchain?: BlockchainNetwork;
  readonly txHash?: string;
  readonly confirmations?: PositiveInt;
  readonly estimatedCompletionTime?: ISODateString;
}

// ==========================================
// DEPOSIT DOMAIN
// ==========================================

/**
 * Deposit method
 */
export type DepositMethod = 'mobile_money' | 'bank_transfer' | 'crypto';

/**
 * Deposit entity
 */
export interface Deposit extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly walletId: WalletId;
  readonly method: DepositMethod;
  readonly provider?: string;
  readonly amountXOF?: XOFAmount;
  readonly amountUSDC: USDCAmount;
  readonly exchangeRate?: number;
  readonly fee: USDCAmount;
  readonly status: TransactionStatus;
  readonly reference: string;
  readonly externalReference?: string;
  readonly phoneNumber?: PhoneNumber;
  readonly accountNumber?: string;
  readonly transactionId?: TransactionId;
  readonly completedAt?: ISODateString;
  readonly failureReason?: string;
}

// ==========================================
// WITHDRAWAL DOMAIN
// ==========================================

/**
 * Withdrawal method
 */
export type WithdrawalMethod = 'mobile_money' | 'bank_transfer' | 'crypto';

/**
 * Withdrawal entity
 */
export interface Withdrawal extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly walletId: WalletId;
  readonly method: WithdrawalMethod;
  readonly provider?: string;
  readonly amountUSDC: USDCAmount;
  readonly amountXOF?: XOFAmount;
  readonly exchangeRate?: number;
  readonly fee: USDCAmount;
  readonly netAmount: USDCAmount;
  readonly status: TransactionStatus;
  readonly reference: string;
  readonly externalReference?: string;
  readonly destinationPhoneNumber?: PhoneNumber;
  readonly destinationAccountNumber?: string;
  readonly destinationAddress?: string;
  readonly transactionId?: TransactionId;
  readonly completedAt?: ISODateString;
  readonly failureReason?: string;
}

// ==========================================
// BENEFICIARY DOMAIN
// ==========================================

/**
 * Beneficiary type
 */
export type BeneficiaryType = 'user' | 'external' | 'merchant';

/**
 * Beneficiary entity
 */
export interface Beneficiary extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly type: BeneficiaryType;
  readonly name: string;
  readonly nickname?: string;
  readonly recipientUserId?: UserId;
  readonly phoneNumber?: PhoneNumber;
  readonly email?: Email;
  readonly walletAddress?: string;
  readonly accountNumber?: string;
  readonly provider?: string;
  readonly isVerified: boolean;
  readonly isFavorite: boolean;
  readonly lastUsedAt?: ISODateString;
  readonly metadata?: Record<string, string>;
}

// ==========================================
// PAYMENT LINK DOMAIN
// ==========================================

/**
 * Payment link status
 */
export type PaymentLinkStatus = 'active' | 'expired' | 'paid' | 'cancelled';

/**
 * Payment link entity
 */
export interface PaymentLink extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly merchantId?: UserId;
  readonly amount: USDCAmount;
  readonly currency: Currency;
  readonly description?: string;
  readonly reference: string;
  readonly shortCode: string;
  readonly url: string;
  readonly status: PaymentLinkStatus;
  readonly expiresAt?: ISODateString;
  readonly paidAt?: ISODateString;
  readonly paidBy?: UserId;
  readonly transactionId?: TransactionId;
  readonly maxUses?: PositiveInt;
  readonly usesCount: PositiveInt;
  readonly requiresAuth: boolean;
  readonly metadata?: Record<string, string>;
}

// ==========================================
// REFERRAL DOMAIN
// ==========================================

/**
 * Referral status
 */
export type ReferralStatus = 'pending' | 'completed' | 'rewarded' | 'expired';

/**
 * Referral entity
 */
export interface Referral extends AuditableEntity {
  readonly id: UUID;
  readonly referrerId: UserId;
  readonly referredUserId: UserId;
  readonly referralCode: string;
  readonly status: ReferralStatus;
  readonly rewardAmount?: USDCAmount;
  readonly rewardedAt?: ISODateString;
  readonly completedAt?: ISODateString;
  readonly expiresAt?: ISODateString;
}

// ==========================================
// SESSION DOMAIN
// ==========================================

/**
 * Session status
 */
export type SessionStatus = 'active' | 'expired' | 'revoked';

/**
 * Session entity
 */
export interface Session extends BaseEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly deviceId: string;
  readonly status: SessionStatus;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: ISODateString;
  readonly lastActivityAt: ISODateString;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: {
    readonly deviceType?: 'mobile' | 'web' | 'desktop';
    readonly osVersion?: string;
    readonly appVersion?: string;
  };
}

// ==========================================
// DEVICE DOMAIN
// ==========================================

/**
 * Device status
 */
export type DeviceStatus = 'active' | 'blacklisted' | 'suspicious';

/**
 * Device entity
 */
export interface Device extends AuditableEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly deviceId: string;
  readonly status: DeviceStatus;
  readonly deviceName?: string;
  readonly deviceType: 'mobile' | 'web' | 'desktop';
  readonly osName?: string;
  readonly osVersion?: string;
  readonly appVersion?: string;
  readonly lastSeenAt: ISODateString;
  readonly firstSeenAt: ISODateString;
  readonly isPrimary: boolean;
  readonly isVerified: boolean;
  readonly trustScore?: number;
}

// ==========================================
// RISK & FRAUD DOMAIN
// ==========================================

/**
 * Risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk score
 */
export interface RiskScore {
  readonly score: number; // 0-100
  readonly level: RiskLevel;
  readonly factors: readonly RiskFactor[];
  readonly computedAt: ISODateString;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  readonly type: string;
  readonly weight: number;
  readonly value: number;
  readonly description: string;
}

/**
 * Fraud alert
 */
export interface FraudAlert extends AuditableEntity {
  readonly id: UUID;
  readonly userId?: UserId;
  readonly transactionId?: TransactionId;
  readonly type: string;
  readonly severity: RiskLevel;
  readonly description: string;
  readonly status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  readonly investigatedBy?: UserId;
  readonly resolvedAt?: ISODateString;
  readonly actionsTaken?: readonly string[];
}

// ==========================================
// COMPLIANCE DOMAIN
// ==========================================

/**
 * AML status
 */
export type AmlStatus = 'clear' | 'pending_review' | 'flagged' | 'blocked';

/**
 * AML check result
 */
export interface AmlCheckResult {
  readonly userId: UserId;
  readonly status: AmlStatus;
  readonly screeningDate: ISODateString;
  readonly provider?: string;
  readonly matchScore?: number;
  readonly hits?: readonly AmlHit[];
  readonly reviewedBy?: UserId;
  readonly reviewedAt?: ISODateString;
}

/**
 * AML hit
 */
export interface AmlHit {
  readonly listName: string;
  readonly matchType: 'exact' | 'fuzzy' | 'partial';
  readonly matchScore: number;
  readonly details?: string;
}

// ==========================================
// NOTIFICATION DOMAIN
// ==========================================

/**
 * Notification type
 */
export type NotificationType =
  | 'transaction'
  | 'security'
  | 'kyc'
  | 'marketing'
  | 'system';

/**
 * Notification channel
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

/**
 * Notification entity
 */
export interface Notification extends BaseEntity {
  readonly id: UUID;
  readonly userId: UserId;
  readonly type: NotificationType;
  readonly channel: NotificationChannel;
  readonly title: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
  readonly isRead: boolean;
  readonly readAt?: ISODateString;
  readonly sentAt?: ISODateString;
  readonly deliveredAt?: ISODateString;
  readonly failedAt?: ISODateString;
  readonly failureReason?: string;
}

// ==========================================
// VALUE OBJECTS
// ==========================================

/**
 * Money value object
 */
export interface Money {
  readonly amount: USDCAmount | XOFAmount;
  readonly currency: Currency;
}

/**
 * Address value object
 */
export interface Address {
  readonly street?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly country: string;
}

/**
 * Full name value object
 */
export interface FullName {
  readonly firstName: string;
  readonly lastName: string;
  readonly middleName?: string;
}

/**
 * Date range value object
 */
export interface DateRange {
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
}
