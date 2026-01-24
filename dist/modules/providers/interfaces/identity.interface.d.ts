export interface CreateUserData {
    userId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    countryCode: string;
}
export interface KycData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
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
    documentFrontUrl?: string;
    documentBackUrl?: string;
    selfieUrl?: string;
}
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired';
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
    providerId: string;
    status: 'active' | 'inactive' | 'blocked';
    kycStatus: KycStatus;
    kycTier: KycTier;
    createdAt: Date;
}
export interface IIdentityProvider {
    readonly providerName: string;
    createUser(data: CreateUserData): Promise<IdentityProviderUser>;
    getUser(providerId: string): Promise<IdentityProviderUser | null>;
    submitKyc(providerId: string, data: KycData): Promise<KycResult>;
    getKycStatus(providerId: string): Promise<KycResult>;
    updateUser(providerId: string, data: Partial<CreateUserData>): Promise<IdentityProviderUser>;
}
export declare const IDENTITY_PROVIDER: unique symbol;
