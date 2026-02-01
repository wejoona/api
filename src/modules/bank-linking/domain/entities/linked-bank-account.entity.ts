import { v4 as uuidv4 } from 'uuid';

export enum BankAccountStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

export enum BankVerificationMethod {
  OTP = 'otp',
  MICRO_DEPOSIT = 'micro_deposit',
  INSTANT = 'instant',
}

export interface LinkedBankAccountProps {
  id?: string;
  walletId: string;
  bankCode: string;
  bankName: string;
  bankLogoUrl?: string | null;
  accountNumberEncrypted: string;
  accountNumberMasked: string;
  accountHolderName: string;
  status?: BankAccountStatus;
  isVerified?: boolean;
  isPrimary?: boolean;
  countryCode?: string;
  currency?: string;
  availableBalance?: number | null;
  lastBalanceCheckAt?: Date | null;
  lastVerifiedAt?: Date | null;
  verificationMethod?: BankVerificationMethod | null;
  supportsBalanceCheck?: boolean;
  supportsDirectDebit?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLinkedBankAccountProps {
  walletId: string;
  bankCode: string;
  bankName: string;
  bankLogoUrl?: string | null;
  accountNumberEncrypted: string;
  accountNumberMasked: string;
  accountHolderName: string;
  countryCode?: string;
  currency?: string;
  supportsBalanceCheck?: boolean;
  supportsDirectDebit?: boolean;
  metadata?: Record<string, unknown> | null;
}

export class LinkedBankAccount {
  readonly id: string;
  readonly walletId: string;
  readonly bankCode: string;
  private _bankName: string;
  private _bankLogoUrl: string | null;
  readonly accountNumberEncrypted: string;
  readonly accountNumberMasked: string;
  private _accountHolderName: string;
  private _status: BankAccountStatus;
  private _isVerified: boolean;
  private _isPrimary: boolean;
  readonly countryCode: string;
  readonly currency: string;
  private _availableBalance: number | null;
  private _lastBalanceCheckAt: Date | null;
  private _lastVerifiedAt: Date | null;
  private _verificationMethod: BankVerificationMethod | null;
  readonly supportsBalanceCheck: boolean;
  readonly supportsDirectDebit: boolean;
  private _metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: LinkedBankAccountProps) {
    this.id = props.id || uuidv4();
    this.walletId = props.walletId;
    this.bankCode = props.bankCode;
    this._bankName = props.bankName;
    this._bankLogoUrl = props.bankLogoUrl ?? null;
    this.accountNumberEncrypted = props.accountNumberEncrypted;
    this.accountNumberMasked = props.accountNumberMasked;
    this._accountHolderName = props.accountHolderName;
    this._status = props.status ?? BankAccountStatus.PENDING;
    this._isVerified = props.isVerified ?? false;
    this._isPrimary = props.isPrimary ?? false;
    this.countryCode = props.countryCode ?? 'CI';
    this.currency = props.currency ?? 'XOF';
    this._availableBalance = props.availableBalance ?? null;
    this._lastBalanceCheckAt = props.lastBalanceCheckAt ?? null;
    this._lastVerifiedAt = props.lastVerifiedAt ?? null;
    this._verificationMethod = props.verificationMethod ?? null;
    this.supportsBalanceCheck = props.supportsBalanceCheck ?? false;
    this.supportsDirectDebit = props.supportsDirectDebit ?? false;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get bankName(): string {
    return this._bankName;
  }

  get bankLogoUrl(): string | null {
    return this._bankLogoUrl;
  }

  get accountHolderName(): string {
    return this._accountHolderName;
  }

  get status(): BankAccountStatus {
    return this._status;
  }

  get isVerified(): boolean {
    return this._isVerified;
  }

  get isPrimary(): boolean {
    return this._isPrimary;
  }

  get availableBalance(): number | null {
    return this._availableBalance;
  }

  get lastBalanceCheckAt(): Date | null {
    return this._lastBalanceCheckAt;
  }

  get lastVerifiedAt(): Date | null {
    return this._lastVerifiedAt;
  }

  get verificationMethod(): BankVerificationMethod | null {
    return this._verificationMethod;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  verify(method: BankVerificationMethod): void {
    this._status = BankAccountStatus.VERIFIED;
    this._isVerified = true;
    this._lastVerifiedAt = new Date();
    this._verificationMethod = method;
  }

  fail(): void {
    this._status = BankAccountStatus.FAILED;
    this._isVerified = false;
  }

  suspend(): void {
    this._status = BankAccountStatus.SUSPENDED;
  }

  setPrimary(): void {
    this._isPrimary = true;
  }

  unsetPrimary(): void {
    this._isPrimary = false;
  }

  updateBalance(balance: number): void {
    this._availableBalance = balance;
    this._lastBalanceCheckAt = new Date();
  }

  updateAccountHolderName(name: string): void {
    this._accountHolderName = name;
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  canDeposit(): boolean {
    return this._isVerified && this._status === BankAccountStatus.VERIFIED;
  }

  canWithdraw(): boolean {
    return (
      this._isVerified &&
      this._status === BankAccountStatus.VERIFIED &&
      this.supportsDirectDebit
    );
  }

  canCheckBalance(): boolean {
    return (
      this._isVerified &&
      this._status === BankAccountStatus.VERIFIED &&
      this.supportsBalanceCheck
    );
  }

  static create(props: CreateLinkedBankAccountProps): LinkedBankAccount {
    return new LinkedBankAccount({
      ...props,
      status: BankAccountStatus.PENDING,
      isVerified: false,
      isPrimary: false,
    });
  }

  static reconstitute(props: LinkedBankAccountProps): LinkedBankAccount {
    return new LinkedBankAccount(props);
  }
}
