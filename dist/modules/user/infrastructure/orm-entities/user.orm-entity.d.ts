export declare class UserOrmEntity {
    id: string;
    phone: string;
    phoneVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    countryCode: string;
    kycStatus: string;
    kycProviderId: string | null;
    circleUserId: string | null;
    circleUserToken: string | null;
    role: string;
    status: string;
    suspendedAt: Date | null;
    suspendedReason: string | null;
    pinHash: string | null;
    pinSetAt: Date | null;
    pinAttempts: number;
    pinLockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
