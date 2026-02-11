import { v4 as uuidv4 } from 'uuid';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';

export interface IUser {
  id: string;
  phone: string;
  phoneVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  countryCode: string;
  kycStatus: KycStatus;
  kycProviderId: string | null;
  // Circle integration
  circleUserId: string | null;
  circleUserToken: string | null;
  // Admin fields
  role: UserRole;
  status: UserStatus;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  // PIN fields
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
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class User implements IUser {
  readonly id: string;
  readonly phone: string;
  phoneVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  readonly countryCode: string;
  kycStatus: KycStatus;
  kycProviderId: string | null;
  // Circle integration
  circleUserId: string | null;
  circleUserToken: string | null;
  // Admin fields
  role: UserRole;
  status: UserStatus;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  // PIN fields
  pinHash: string | null;
  pinSetAt: Date | null;
  pinAttempts: number;
  pinLockedUntil: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IUser) {
    this.id = props.id;
    this.phone = props.phone;
    this.phoneVerified = props.phoneVerified;
    this.username = props.username;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.avatarUrl = props.avatarUrl;
    this.countryCode = props.countryCode;
    this.kycStatus = props.kycStatus;
    this.kycProviderId = props.kycProviderId;
    this.circleUserId = props.circleUserId;
    this.circleUserToken = props.circleUserToken;
    this.role = props.role;
    this.status = props.status;
    this.suspendedAt = props.suspendedAt;
    this.suspendedReason = props.suspendedReason;
    this.pinHash = props.pinHash;
    this.pinSetAt = props.pinSetAt;
    this.pinAttempts = props.pinAttempts;
    this.pinLockedUntil = props.pinLockedUntil;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateUserProps): User {
    const now = new Date();
    return new User({
      id: uuidv4(),
      phone: props.phone,
      phoneVerified: false,
      username: null,
      firstName: null,
      lastName: null,
      email: null,
      avatarUrl: null,
      countryCode: props.countryCode || 'CI',
      kycStatus: 'pending',
      kycProviderId: null,
      circleUserId: null,
      circleUserToken: null,
      role: 'user',
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
      pinHash: null,
      pinSetAt: null,
      pinAttempts: 0,
      pinLockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: IUser): User {
    return new User(props);
  }

  verifyPhone(): void {
    this.phoneVerified = true;
    this.updatedAt = new Date();
  }

  updateProfile(props: UpdateUserProps): void {
    if (props.username !== undefined) this.username = props.username;
    if (props.firstName !== undefined) this.firstName = props.firstName;
    if (props.lastName !== undefined) this.lastName = props.lastName;
    if (props.email !== undefined) this.email = props.email;
    this.updatedAt = new Date();
  }

  /**
   * Update avatar URL
   */
  updateAvatar(avatarUrl: string | null): void {
    this.avatarUrl = avatarUrl;
    this.updatedAt = new Date();
  }

  /**
   * Set username (@handle)
   */
  setUsername(username: string | null): void {
    this.username = username;
    this.updatedAt = new Date();
  }

  /**
   * Get display name (username if set, otherwise full name or phone)
   */
  get displayName(): string {
    if (this.username) return `@${this.username}`;
    if (this.fullName) return this.fullName;
    return this.phone;
  }

  submitKyc(kycProviderId: string): void {
    this.kycStatus = 'submitted';
    this.kycProviderId = kycProviderId;
    this.updatedAt = new Date();
  }

  approveKyc(): void {
    this.kycStatus = 'approved';
    this.updatedAt = new Date();
  }

  rejectKyc(): void {
    this.kycStatus = 'rejected';
    this.updatedAt = new Date();
  }

  /**
   * Update KYC status (used by KYC approval listener)
   */
  updateKycStatus(status: KycStatus): void {
    this.kycStatus = status;
    this.updatedAt = new Date();
  }

  /**
   * Link user to Circle
   */
  linkToCircle(circleUserId: string, userToken?: string): void {
    this.circleUserId = circleUserId;
    if (userToken) {
      this.circleUserToken = userToken;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update Circle user token (tokens expire and need refresh)
   */
  updateCircleUserToken(userToken: string): void {
    this.circleUserToken = userToken;
    this.updatedAt = new Date();
  }

  get isLinkedToCircle(): boolean {
    return this.circleUserId !== null;
  }

  get fullName(): string | null {
    if (!this.firstName && !this.lastName) return null;
    return [this.firstName, this.lastName].filter(Boolean).join(' ');
  }

  get isPhoneVerified(): boolean {
    return this.phoneVerified;
  }

  get isKycApproved(): boolean {
    return this.kycStatus === 'approved';
  }

  get canTransact(): boolean {
    return this.phoneVerified;
  }

  get canWithdraw(): boolean {
    return this.phoneVerified && this.isKycApproved && this.isActive;
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isSuspended(): boolean {
    return this.status === 'suspended';
  }

  get isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'super_admin';
  }

  get isSuperAdmin(): boolean {
    return this.role === 'super_admin';
  }

  /**
   * Suspend the user account
   */
  suspend(reason: string): void {
    this.status = 'suspended';
    this.suspendedAt = new Date();
    this.suspendedReason = reason;
    this.updatedAt = new Date();
  }

  /**
   * Unsuspend (reactivate) the user account
   */
  unsuspend(): void {
    this.status = 'active';
    this.suspendedAt = null;
    this.suspendedReason = null;
    this.updatedAt = new Date();
  }

  /**
   * Deactivate the user account (permanent)
   */
  deactivate(): void {
    this.status = 'deactivated';
    this.updatedAt = new Date();
  }

  /**
   * Change user role (admin operation)
   */
  setRole(role: UserRole): void {
    this.role = role;
    this.updatedAt = new Date();
  }

  // ============================================
  // PIN METHODS
  // ============================================

  /**
   * Set the user's PIN (hashed)
   */
  setPin(pinHash: string): void {
    this.pinHash = pinHash;
    this.pinSetAt = new Date();
    this.pinAttempts = 0;
    this.pinLockedUntil = null;
    this.updatedAt = new Date();
  }

  /**
   * Check if PIN is set
   */
  get hasPin(): boolean {
    return this.pinHash !== null;
  }

  /**
   * Check if PIN is locked due to too many failed attempts
   */
  get isPinLocked(): boolean {
    if (!this.pinLockedUntil) return false;
    return new Date() < this.pinLockedUntil;
  }

  /**
   * Record a failed PIN attempt
   * Locks the account after 5 failed attempts for 30 minutes
   */
  recordFailedPinAttempt(): void {
    this.pinAttempts += 1;
    if (this.pinAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 30);
      this.pinLockedUntil = lockUntil;
    }
    this.updatedAt = new Date();
  }

  /**
   * Reset PIN attempts after successful verification
   */
  resetPinAttempts(): void {
    this.pinAttempts = 0;
    this.pinLockedUntil = null;
    this.updatedAt = new Date();
  }

  /**
   * Clear the PIN (for reset flow)
   */
  clearPin(): void {
    this.pinHash = null;
    this.pinSetAt = null;
    this.pinAttempts = 0;
    this.pinLockedUntil = null;
    this.updatedAt = new Date();
  }
}
