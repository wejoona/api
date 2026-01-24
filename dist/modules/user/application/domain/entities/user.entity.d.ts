export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export interface IUser {
    id: string;
    phone: string;
    phoneVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    countryCode: string;
    kycStatus: KycStatus;
    kycProviderId: string | null;
    circleUserId: string | null;
    circleUserToken: string | null;
    role: UserRole;
    status: UserStatus;
    suspendedAt: Date | null;
    suspendedReason: string | null;
    pinHash: string | null;
    pinSetAt: Date | null;
    pinAttempts: number;
    pinLockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserProps {
    phone: string;
    countryCode?: string;
}
export interface UpdateUserProps {
    firstName?: string;
    lastName?: string;
    email?: string;
}
export declare class User implements IUser {
    readonly id: string;
    readonly phone: string;
    phoneVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    readonly countryCode: string;
    kycStatus: KycStatus;
    kycProviderId: string | null;
    circleUserId: string | null;
    circleUserToken: string | null;
    role: UserRole;
    status: UserStatus;
    suspendedAt: Date | null;
    suspendedReason: string | null;
    pinHash: string | null;
    pinSetAt: Date | null;
    pinAttempts: number;
    pinLockedUntil: Date | null;
    readonly createdAt: Date;
    updatedAt: Date;
    private constructor();
    static create(props: CreateUserProps): User;
    static reconstitute(props: IUser): User;
    verifyPhone(): void;
    updateProfile(props: UpdateUserProps): void;
    submitKyc(kycProviderId: string): void;
    approveKyc(): void;
    rejectKyc(): void;
    linkToCircle(circleUserId: string, userToken?: string): void;
    updateCircleUserToken(userToken: string): void;
    get isLinkedToCircle(): boolean;
    get fullName(): string | null;
    get isPhoneVerified(): boolean;
    get isKycApproved(): boolean;
    get canTransact(): boolean;
    get canWithdraw(): boolean;
    get isActive(): boolean;
    get isSuspended(): boolean;
    get isAdmin(): boolean;
    get isSuperAdmin(): boolean;
    suspend(reason: string): void;
    unsuspend(): void;
    deactivate(): void;
    setRole(role: UserRole): void;
    setPin(pinHash: string): void;
    get hasPin(): boolean;
    get isPinLocked(): boolean;
    recordFailedPinAttempt(): void;
    resetPinAttempts(): void;
    clearPin(): void;
}
