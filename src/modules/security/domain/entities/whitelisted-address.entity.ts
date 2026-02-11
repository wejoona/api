import { v4 as uuidv4 } from 'uuid';

export type AddressType = 'internal' | 'external';
export type WhitelistStatus = 'pending' | 'active' | 'revoked';

export interface IWhitelistedAddress {
  id: string;
  userId: string;
  address: string;
  label: string;
  addressType: AddressType;
  network: string | null;
  status: WhitelistStatus;
  verifiedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWhitelistedAddressProps {
  userId: string;
  address: string;
  label: string;
  addressType?: AddressType;
  network?: string;
}

export class WhitelistedAddress implements IWhitelistedAddress {
  readonly id: string;
  readonly userId: string;
  readonly address: string;
  label: string;
  readonly addressType: AddressType;
  readonly network: string | null;
  status: WhitelistStatus;
  verifiedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IWhitelistedAddress) {
    this.id = props.id;
    this.userId = props.userId;
    this.address = props.address;
    this.label = props.label;
    this.addressType = props.addressType;
    this.network = props.network;
    this.status = props.status;
    this.verifiedAt = props.verifiedAt;
    this.lastUsedAt = props.lastUsedAt;
    this.usageCount = props.usageCount;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateWhitelistedAddressProps): WhitelistedAddress {
    if (!props.address || props.address.trim().length === 0) {
      throw new Error('Wallet address is required');
    }
    if (!props.label || props.label.trim().length === 0) {
      throw new Error('Address label is required');
    }
    if (props.label.length > 100) {
      throw new Error('Address label must be 100 characters or less');
    }

    const now = new Date();
    return new WhitelistedAddress({
      id: uuidv4(),
      userId: props.userId,
      address: props.address.toLowerCase(),
      label: props.label,
      addressType: props.addressType || 'external',
      network: props.network || null,
      status: 'pending', // Requires verification
      verifiedAt: null,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: IWhitelistedAddress): WhitelistedAddress {
    return new WhitelistedAddress(props);
  }

  verify(): void {
    this.status = 'active';
    this.verifiedAt = new Date();
    this.updatedAt = new Date();
  }

  revoke(): void {
    this.status = 'revoked';
    this.updatedAt = new Date();
  }

  recordUsage(): void {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
    this.updatedAt = new Date();
  }

  updateLabel(label: string): void {
    this.label = label;
    this.updatedAt = new Date();
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isVerified(): boolean {
    return this.verifiedAt !== null && this.status === 'active';
  }

  /**
   * Check if this is a new address (never used or added within 24h)
   * New addresses require additional security for large withdrawals
   */
  get isNewAddress(): boolean {
    if (this.usageCount === 0) return true;

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return this.createdAt > twentyFourHoursAgo;
  }

  /**
   * Hours until address is considered trusted (no longer new)
   */
  get hoursUntilTrusted(): number {
    if (!this.isNewAddress) return 0;

    const trustedTime = new Date(this.createdAt);
    trustedTime.setHours(trustedTime.getHours() + 24);

    const now = new Date();
    const diffMs = trustedTime.getTime() - now.getTime();

    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  }
}
