/**
 * Identity Provider Interface
 *
 * Handles user identity and KYC across providers.
 * Current implementation: Circle
 * Future: In-house KYC system
 */

export interface CreateUserData {
  userId: string; // Your internal user ID
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  countryCode: string; // ISO country code (CI, US, etc.)
}

export interface KycData {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  countryCode: string;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiryDate?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  // Document URLs (for providers that need them)
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
}

export type KycStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';
export type KycTier = 'none' | 'basic' | 'standard' | 'enhanced';

export interface KycResult {
  status: KycStatus;
  tier: KycTier;
  rejectionReason?: string;
  requiredDocuments?: string[];
  limits?: {
    dailyDeposit: number;
    dailyWithdrawal: number;
    monthlyVolume: number;
  };
}

export interface IdentityProviderUser {
  providerId: string; // Provider's user ID
  status: 'active' | 'inactive' | 'blocked';
  kycStatus: KycStatus;
  kycTier: KycTier;
  createdAt: Date;
}

export interface IIdentityProvider {
  readonly providerName: string;

  /**
   * Create a user in the identity provider
   */
  createUser(data: CreateUserData): Promise<IdentityProviderUser>;

  /**
   * Get user by provider ID
   */
  getUser(providerId: string): Promise<IdentityProviderUser | null>;

  /**
   * Submit KYC documents for verification
   */
  submitKyc(providerId: string, data: KycData): Promise<KycResult>;

  /**
   * Get current KYC status
   */
  getKycStatus(providerId: string): Promise<KycResult>;

  /**
   * Update user information
   */
  updateUser(
    providerId: string,
    data: Partial<CreateUserData>,
  ): Promise<IdentityProviderUser>;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
