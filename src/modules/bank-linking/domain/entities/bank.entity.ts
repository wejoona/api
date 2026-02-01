import { BankVerificationMethod } from './linked-bank-account.entity';

export interface BankProps {
  code: string;
  name: string;
  logoUrl?: string | null;
  country: string;
  verificationMethods: BankVerificationMethod[];
  supportsBalanceCheck: boolean;
  supportsDirectDebit: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Bank {
  readonly code: string;
  readonly name: string;
  readonly logoUrl: string | null;
  readonly country: string;
  readonly verificationMethods: BankVerificationMethod[];
  readonly supportsBalanceCheck: boolean;
  readonly supportsDirectDebit: boolean;
  private _isActive: boolean;
  private _metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BankProps) {
    this.code = props.code;
    this.name = props.name;
    this.logoUrl = props.logoUrl ?? null;
    this.country = props.country;
    this.verificationMethods = props.verificationMethods;
    this.supportsBalanceCheck = props.supportsBalanceCheck;
    this.supportsDirectDebit = props.supportsDirectDebit;
    this._isActive = props.isActive ?? true;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  supportsVerificationMethod(method: BankVerificationMethod): boolean {
    return this.verificationMethods.includes(method);
  }

  static create(props: BankProps): Bank {
    return new Bank(props);
  }

  static reconstitute(props: BankProps): Bank {
    return new Bank(props);
  }
}
