/**
 * Type System Index
 *
 * Central export for all TypeScript types in the JoonaPay backend
 */

// Core strict types
export * from './strict-types';

// API types
export * from './api-types';

// Domain types - explicitly export to avoid conflicts with strict-types
export {
  // USER DOMAIN
  UserRole,
  UserStatus,
  User,
  UserMetadata,
  // KYC DOMAIN - skip duplicates (KycStatus, KycTier defined in strict-types)
  KycDocumentType,
  KycVerification,
  KycTierLimits,
  // WALLET DOMAIN
  WalletStatus,
  WalletType,
  Currency,
  BlockchainNetwork,
  Wallet,
  BalanceSnapshot,
  // TRANSACTION DOMAIN - skip duplicates (TransactionStatus, TransactionType defined in strict-types)
  PaymentMethod,
  MobileMoneyProvider,
  Transaction,
  TransactionMetadata,
  GeoLocation,
  // TRANSFER DOMAIN
  TransferStatus,
  Transfer,
  // DEPOSIT DOMAIN
  DepositMethod,
  Deposit,
  // WITHDRAWAL DOMAIN
  WithdrawalMethod,
  Withdrawal,
  // BENEFICIARY DOMAIN
  BeneficiaryType,
  Beneficiary,
  // PAYMENT LINK DOMAIN
  PaymentLinkStatus,
  PaymentLink,
  // REFERRAL DOMAIN
  ReferralStatus,
  Referral,
  // SESSION DOMAIN
  SessionStatus,
  Session,
  // DEVICE DOMAIN
  DeviceStatus,
  Device,
  // RISK & FRAUD DOMAIN
  RiskLevel,
  RiskScore,
  RiskFactor,
  FraudAlert,
  // COMPLIANCE DOMAIN
  AmlStatus,
  AmlCheckResult,
  AmlHit,
  // NOTIFICATION DOMAIN
  NotificationType,
  NotificationChannel,
  Notification,
  // VALUE OBJECTS - skip Money (defined in strict-types)
  Address,
  FullName,
  DateRange,
} from './domain-types';

// Note: TypeScript utility types (Readonly, Partial, Required, etc.) are globally available
// and don't need to be re-exported
