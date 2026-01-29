import { v4 as uuidv4 } from 'uuid';

export enum BeneficiaryAccountType {
  JOONAPAY_USER = 'joonapay_user',
  EXTERNAL_WALLET = 'external_wallet',
  BANK_ACCOUNT = 'bank_account',
  MOBILE_MONEY = 'mobile_money',
}

export interface BeneficiaryProps {
  id?: string;
  walletId: string;
  name: string;
  phoneE164?: string | null;
  accountType?: BeneficiaryAccountType;
  beneficiaryUserId?: string | null;
  beneficiaryWalletAddress?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  mobileMoneyProvider?: string | null;
  isFavorite?: boolean;
  isVerified?: boolean;
  transferCount?: number;
  totalTransferred?: number;
  lastTransferAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBeneficiaryProps {
  walletId: string;
  name: string;
  phoneE164?: string | null;
  accountType?: BeneficiaryAccountType;
  beneficiaryUserId?: string | null;
  beneficiaryWalletAddress?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  mobileMoneyProvider?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class Beneficiary {
  readonly id: string;
  readonly walletId: string;
  private _name: string;
  readonly phoneE164: string | null;
  readonly accountType: BeneficiaryAccountType;
  readonly beneficiaryUserId: string | null;
  readonly beneficiaryWalletAddress: string | null;
  readonly bankCode: string | null;
  readonly bankAccountNumber: string | null;
  readonly mobileMoneyProvider: string | null;
  private _isFavorite: boolean;
  private _isVerified: boolean;
  private _transferCount: number;
  private _totalTransferred: number;
  private _lastTransferAt: Date | null;
  private _metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BeneficiaryProps) {
    this.id = props.id || uuidv4();
    this.walletId = props.walletId;
    this._name = props.name;
    this.phoneE164 = props.phoneE164 ?? null;
    this.accountType =
      props.accountType ?? BeneficiaryAccountType.JOONAPAY_USER;
    this.beneficiaryUserId = props.beneficiaryUserId ?? null;
    this.beneficiaryWalletAddress = props.beneficiaryWalletAddress ?? null;
    this.bankCode = props.bankCode ?? null;
    this.bankAccountNumber = props.bankAccountNumber ?? null;
    this.mobileMoneyProvider = props.mobileMoneyProvider ?? null;
    this._isFavorite = props.isFavorite ?? false;
    this._isVerified = props.isVerified ?? false;
    this._transferCount = props.transferCount ?? 0;
    this._totalTransferred = props.totalTransferred ?? 0;
    this._lastTransferAt = props.lastTransferAt ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get name(): string {
    return this._name;
  }

  get isFavorite(): boolean {
    return this._isFavorite;
  }

  get isVerified(): boolean {
    return this._isVerified;
  }

  get transferCount(): number {
    return this._transferCount;
  }

  get totalTransferred(): number {
    return this._totalTransferred;
  }

  get lastTransferAt(): Date | null {
    return this._lastTransferAt;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  get isJoonaPayUser(): boolean {
    return this.accountType === BeneficiaryAccountType.JOONAPAY_USER;
  }

  get isMobileMoney(): boolean {
    return this.accountType === BeneficiaryAccountType.MOBILE_MONEY;
  }

  get isBankAccount(): boolean {
    return this.accountType === BeneficiaryAccountType.BANK_ACCOUNT;
  }

  get isExternalWallet(): boolean {
    return this.accountType === BeneficiaryAccountType.EXTERNAL_WALLET;
  }

  updateName(name: string): void {
    this._name = name;
  }

  toggleFavorite(): void {
    this._isFavorite = !this._isFavorite;
  }

  setFavorite(isFavorite: boolean): void {
    this._isFavorite = isFavorite;
  }

  verify(): void {
    this._isVerified = true;
  }

  recordTransfer(amount: number): void {
    this._transferCount++;
    this._totalTransferred += amount;
    this._lastTransferAt = new Date();
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  static create(props: CreateBeneficiaryProps): Beneficiary {
    return new Beneficiary({
      ...props,
      isFavorite: false,
      isVerified: props.beneficiaryUserId ? true : false,
      transferCount: 0,
      totalTransferred: 0,
    });
  }

  static reconstitute(props: BeneficiaryProps): Beneficiary {
    return new Beneficiary(props);
  }
}
