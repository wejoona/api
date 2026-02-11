import { v4 as uuidv4 } from 'uuid';

export enum BusinessStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface BusinessProps {
  id?: string;
  userId: string;
  name: string;
  registrationNumber: string;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: BusinessStatus;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBusinessProps {
  userId: string;
  name: string;
  registrationNumber: string;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
}

export class Business {
  readonly id: string;
  readonly userId: string;
  private _name: string;
  private _registrationNumber: string;
  private _industry: string | null;
  private _address: string | null;
  private _city: string | null;
  private _country: string | null;
  private _phone: string | null;
  private _email: string | null;
  private _status: BusinessStatus;
  private _verifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BusinessProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this._name = props.name;
    this._registrationNumber = props.registrationNumber;
    this._industry = props.industry ?? null;
    this._address = props.address ?? null;
    this._city = props.city ?? null;
    this._country = props.country ?? null;
    this._phone = props.phone ?? null;
    this._email = props.email ?? null;
    this._status = props.status ?? BusinessStatus.PENDING;
    this._verifiedAt = props.verifiedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get name(): string {
    return this._name;
  }

  get registrationNumber(): string {
    return this._registrationNumber;
  }

  get industry(): string | null {
    return this._industry;
  }

  get address(): string | null {
    return this._address;
  }

  get city(): string | null {
    return this._city;
  }

  get country(): string | null {
    return this._country;
  }

  get phone(): string | null {
    return this._phone;
  }

  get email(): string | null {
    return this._email;
  }

  get status(): BusinessStatus {
    return this._status;
  }

  get verifiedAt(): Date | null {
    return this._verifiedAt;
  }

  get isVerified(): boolean {
    return (
      this._verifiedAt !== null && this._status === BusinessStatus.APPROVED
    );
  }

  get isPending(): boolean {
    return this._status === BusinessStatus.PENDING;
  }

  get isApproved(): boolean {
    return this._status === BusinessStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this._status === BusinessStatus.REJECTED;
  }

  updateName(name: string): void {
    this._name = name;
  }

  updateDetails(details: {
    registrationNumber?: string;
    industry?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
  }): void {
    if (details.registrationNumber !== undefined) {
      this._registrationNumber = details.registrationNumber;
    }
    if (details.industry !== undefined) {
      this._industry = details.industry;
    }
    if (details.address !== undefined) {
      this._address = details.address;
    }
    if (details.city !== undefined) {
      this._city = details.city;
    }
    if (details.country !== undefined) {
      this._country = details.country;
    }
    if (details.phone !== undefined) {
      this._phone = details.phone;
    }
    if (details.email !== undefined) {
      this._email = details.email;
    }
  }

  approve(): void {
    this._status = BusinessStatus.APPROVED;
    this._verifiedAt = new Date();
  }

  reject(): void {
    this._status = BusinessStatus.REJECTED;
    this._verifiedAt = null;
  }

  static create(props: CreateBusinessProps): Business {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Business name is required');
    }
    if (!props.ownerId) {
      throw new Error('Business owner ID is required');
    }

    return new Business({
      ...props,
      status: BusinessStatus.PENDING,
      verifiedAt: null,
    });
  }

  static reconstitute(props: BusinessProps): Business {
    return new Business(props);
  }
}
