/**
 * Contract Schemas Index
 *
 * Export all contract schemas for use in tests and documentation.
 */

// Type definitions
export * from './types';

// Auth contracts
export * from './auth.contract';

// Wallet contracts
export * from './wallet.contract';

// Transaction contracts
export * from './transaction.contract';

// Transfer contracts
export * from './transfer.contract';

// KYC contracts
export * from './kyc.contract';

// Contact contracts
export * from './contact.contract';

// Beneficiary contracts
export * from './beneficiary.contract';

// User contracts
export * from './user.contract';

// Notification contracts
export * from './notification.contract';

// Device and session contracts
export * from './device-session.contract';

// Feature flag contracts
export * from './feature-flag.contract';

// Secondary feature capability contracts
export * from './secondary-feature.contract';

// Referral contracts
export * from './referral.contract';

// Savings pot contracts
export * from './savings-pot.contract';

// App config contracts
export * from './app-config.contract';

// Health contracts
export * from './health.contract';

// All contract groups
import { AuthContractGroup } from './auth.contract';
import { WalletContractGroup } from './wallet.contract';
import { TransactionContractGroup } from './transaction.contract';
import { TransferContractGroup } from './transfer.contract';
import { KycContractGroup } from './kyc.contract';
import { ContactContractGroup } from './contact.contract';
import { BeneficiaryContractGroup } from './beneficiary.contract';
import { UserContractGroup } from './user.contract';
import { NotificationContractGroup } from './notification.contract';
import { DeviceSessionContractGroup } from './device-session.contract';
import { FeatureFlagContractGroup } from './feature-flag.contract';
import { SecondaryFeatureContractGroup } from './secondary-feature.contract';
import { ReferralContractGroup } from './referral.contract';
import { SavingsPotContractGroup } from './savings-pot.contract';
import { FeatureSubscriptionContractGroup } from './feature-subscription.contract';
import { AppConfigContractGroup } from './app-config.contract';
import { HealthContractGroup } from './health.contract';

export const AllContractGroups = [
  AuthContractGroup,
  WalletContractGroup,
  TransactionContractGroup,
  TransferContractGroup,
  KycContractGroup,
  ContactContractGroup,
  BeneficiaryContractGroup,
  UserContractGroup,
  NotificationContractGroup,
  DeviceSessionContractGroup,
  FeatureFlagContractGroup,
  SecondaryFeatureContractGroup,
  ReferralContractGroup,
  SavingsPotContractGroup,
  FeatureSubscriptionContractGroup,
  AppConfigContractGroup,
  HealthContractGroup,
];
