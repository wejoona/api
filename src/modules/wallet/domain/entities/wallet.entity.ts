import { v4 as uuidv4 } from 'uuid';

export type WalletStatus = 'active' | 'suspended' | 'closed';
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface IWallet {
  id: string;
  userId: string;
  yellowCardWalletId: string | null;
  // Circle integration
  circleWalletId: string | null;
  circleWalletAddress: string | null;
  currency: string;
  balance: number;
  kycStatus: KycStatus;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletProps {
  userId: string;
  yellowCardWalletId?: string;
  circleWalletId?: string;
  circleWalletAddress?: string;
  currency?: string;
}

export class WalletEntity implements IWallet {
  readonly id: string;
  readonly userId: string;
  yellowCardWalletId: string | null;
  // Circle integration
  circleWalletId: string | null;
  circleWalletAddress: string | null;
  readonly currency: string;
  balance: number;
  kycStatus: KycStatus;
  status: WalletStatus;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IWallet) {
    this.id = props.id;
    this.userId = props.userId;
    this.yellowCardWalletId = props.yellowCardWalletId;
    this.circleWalletId = props.circleWalletId;
    this.circleWalletAddress = props.circleWalletAddress;
    this.currency = props.currency;
    this.balance = props.balance;
    this.kycStatus = props.kycStatus;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateWalletProps): WalletEntity {
    const now = new Date();
    return new WalletEntity({
      id: uuidv4(),
      userId: props.userId,
      yellowCardWalletId: props.yellowCardWalletId || null,
      circleWalletId: props.circleWalletId || null,
      circleWalletAddress: props.circleWalletAddress || null,
      currency: props.currency || 'USDC',
      balance: 0,
      kycStatus: 'none',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: IWallet): WalletEntity {
    return new WalletEntity(props);
  }

  linkYellowCard(yellowCardWalletId: string): void {
    this.yellowCardWalletId = yellowCardWalletId;
    this.updatedAt = new Date();
  }

  /**
   * Link wallet to Circle
   */
  linkToCircle(circleWalletId: string, circleWalletAddress?: string): void {
    this.circleWalletId = circleWalletId;
    if (circleWalletAddress) {
      this.circleWalletAddress = circleWalletAddress;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update Circle wallet address (when deposit address is generated)
   */
  setCircleWalletAddress(address: string): void {
    this.circleWalletAddress = address;
    this.updatedAt = new Date();
  }

  // Alias for generic provider linking (now uses Circle)
  linkProvider(providerWalletId: string): void {
    this.linkToCircle(providerWalletId);
  }

  credit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }
    this.balance += amount;
    this.updatedAt = new Date();
  }

  debit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }
    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }
    this.balance -= amount;
    this.updatedAt = new Date();
  }

  updateKycStatus(status: KycStatus): void {
    this.kycStatus = status;
    this.updatedAt = new Date();
  }

  suspend(): void {
    this.status = 'suspended';
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = 'active';
    this.updatedAt = new Date();
  }

  close(): void {
    this.status = 'closed';
    this.updatedAt = new Date();
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isLinkedToYellowCard(): boolean {
    return this.yellowCardWalletId !== null;
  }

  get isLinkedToCircle(): boolean {
    return this.circleWalletId !== null;
  }

  get isLinkedToProvider(): boolean {
    return this.circleWalletId !== null;
  }

  get isKycVerified(): boolean {
    return this.kycStatus === 'verified';
  }

  get providerWalletId(): string | null {
    return this.circleWalletId;
  }

  get depositAddress(): string | null {
    return this.circleWalletAddress;
  }
}
