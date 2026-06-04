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

// App config contracts
export * from './app-config.contract';

// All contract groups
import { AuthContractGroup } from './auth.contract';
import { WalletContractGroup } from './wallet.contract';
import { TransactionContractGroup } from './transaction.contract';
import { KycContractGroup } from './kyc.contract';
import { ContactContractGroup } from './contact.contract';
import { BeneficiaryContractGroup } from './beneficiary.contract';
import { UserContractGroup } from './user.contract';
import { NotificationContractGroup } from './notification.contract';
import { DeviceSessionContractGroup } from './device-session.contract';
import { AppConfigContractGroup } from './app-config.contract';

export const AllContractGroups = [
  AuthContractGroup,
  WalletContractGroup,
  TransactionContractGroup,
  KycContractGroup,
  ContactContractGroup,
  BeneficiaryContractGroup,
  UserContractGroup,
  NotificationContractGroup,
  DeviceSessionContractGroup,
  AppConfigContractGroup,
];
