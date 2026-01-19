import { v4 as uuidv4 } from 'uuid';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

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
  // Circle integration
  circleUserId: string | null;
  circleUserToken: string | null;
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

export class User implements IUser {
  readonly id: string;
  readonly phone: string;
  phoneVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  readonly countryCode: string;
  kycStatus: KycStatus;
  kycProviderId: string | null;
  // Circle integration
  circleUserId: string | null;
  circleUserToken: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IUser) {
    this.id = props.id;
    this.phone = props.phone;
    this.phoneVerified = props.phoneVerified;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.countryCode = props.countryCode;
    this.kycStatus = props.kycStatus;
    this.kycProviderId = props.kycProviderId;
    this.circleUserId = props.circleUserId;
    this.circleUserToken = props.circleUserToken;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateUserProps): User {
    const now = new Date();
    return new User({
      id: uuidv4(),
      phone: props.phone,
      phoneVerified: false,
      firstName: null,
      lastName: null,
      email: null,
      countryCode: props.countryCode || 'CI',
      kycStatus: 'pending',
      kycProviderId: null,
      circleUserId: null,
      circleUserToken: null,
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
    if (props.firstName !== undefined) this.firstName = props.firstName;
    if (props.lastName !== undefined) this.lastName = props.lastName;
    if (props.email !== undefined) this.email = props.email;
    this.updatedAt = new Date();
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
    return this.phoneVerified && this.isKycApproved;
  }
}
