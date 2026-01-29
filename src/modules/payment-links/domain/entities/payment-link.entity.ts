import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export enum PaymentLinkStatus {
  ACTIVE = 'active',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface PaymentLinkProps {
  id?: string;
  userId!: string;
  walletId!: string;
  code?: string;
  amount?: number | null;
  currency!: string;
  description?: string | null;
  status?: PaymentLinkStatus;
  expiresAt?: Date | null;
  paidAt?: Date | null;
  paidByUserId?: string | null;
  viewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePaymentLinkProps {
  userId!: string;
  walletId!: string;
  amount?: number | null;
  currency?: string;
  description?: string | null;
  expiresAt?: Date | null;
}

export class PaymentLink {
  readonly id: string;
  readonly userId: string;
  readonly walletId: string;
  readonly code: string;
  private _amount: number | null;
  readonly currency: string;
  private _description: string | null;
  private _status: PaymentLinkStatus;
  private _expiresAt: Date | null;
  private _paidAt: Date | null;
  private _paidByUserId: string | null;
  private _viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PaymentLinkProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this.walletId = props.walletId;
    this.code = props.code || nanoid();
    this._amount = props.amount ?? null;
    this.currency = props.currency || 'USDC';
    this._description = props.description ?? null;
    this._status = props.status || PaymentLinkStatus.ACTIVE;
    this._expiresAt = props.expiresAt ?? null;
    this._paidAt = props.paidAt ?? null;
    this._paidByUserId = props.paidByUserId ?? null;
    this._viewCount = props.viewCount || 0;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  get amount(): number | null {
    return this._amount;
  }

  get description(): string | null {
    return this._description;
  }

  get status(): PaymentLinkStatus {
    return this._status;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get paidAt(): Date | null {
    return this._paidAt;
  }

  get paidByUserId(): string | null {
    return this._paidByUserId;
  }

  get viewCount(): number {
    return this._viewCount;
  }

  get isExpired(): boolean {
    if (!this._expiresAt) return false;
    return new Date() > this._expiresAt;
  }

  get isActive(): boolean {
    return this._status === PaymentLinkStatus.ACTIVE && !this.isExpired;
  }

  get isFlexibleAmount(): boolean {
    return this._amount === null;
  }

  incrementViewCount(): void {
    this._viewCount += 1;
  }

  markAsPaid(paidByUserId: string): void {
    if (this._status !== PaymentLinkStatus.ACTIVE) {
      throw new Error('Payment link is not active');
    }
    if (this.isExpired) {
      throw new Error('Payment link has expired');
    }
    this._status = PaymentLinkStatus.PAID;
    this._paidAt = new Date();
    this._paidByUserId = paidByUserId;
  }

  cancel(): void {
    if (this._status === PaymentLinkStatus.PAID) {
      throw new Error('Cannot cancel a paid payment link');
    }
    this._status = PaymentLinkStatus.CANCELLED;
  }

  expire(): void {
    if (this._status === PaymentLinkStatus.ACTIVE && this.isExpired) {
      this._status = PaymentLinkStatus.EXPIRED;
    }
  }

  static create(props: CreatePaymentLinkProps): PaymentLink {
    return new PaymentLink({
      ...props,
      currency!: props.currency || 'USDC',
      status!: PaymentLinkStatus.ACTIVE,
    });
  }

  static reconstitute(props: PaymentLinkProps): PaymentLink {
    return new PaymentLink(props);
  }
}
