import { v4 as uuidv4 } from 'uuid';

export enum VerificationIdentifierType {
  PHONE = 'phone',
  EMAIL = 'email',
}

export enum VerificationType {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PIN_RESET = 'pin_reset',
  PHONE_CHANGE = 'phone_change',
  SENSITIVE_ACTION = 'sensitive_action',
  TWO_FACTOR = 'two_factor',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export interface VerificationProps {
  id?: string;
  userId?: string | null;
  identifier: string;
  identifierType: VerificationIdentifierType;
  type: VerificationType;
  codeHash: string;
  attempts?: number;
  maxAttempts?: number;
  status?: VerificationStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt: Date;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateVerificationProps {
  userId?: string | null;
  identifier: string;
  identifierType?: VerificationIdentifierType;
  type: VerificationType;
  codeHash: string;
  maxAttempts?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt: Date;
}

export class Verification {
  readonly id: string;
  readonly userId: string | null;
  readonly identifier: string;
  readonly identifierType: VerificationIdentifierType;
  readonly type: VerificationType;
  readonly codeHash: string;
  private _attempts: number;
  readonly maxAttempts: number;
  private _status: VerificationStatus;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly deviceFingerprint: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly expiresAt: Date;
  private _verifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: VerificationProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId ?? null;
    this.identifier = props.identifier;
    this.identifierType = props.identifierType;
    this.type = props.type;
    this.codeHash = props.codeHash;
    this._attempts = props.attempts ?? 0;
    this.maxAttempts = props.maxAttempts ?? 3;
    this._status = props.status ?? VerificationStatus.PENDING;
    this.ipAddress = props.ipAddress ?? null;
    this.userAgent = props.userAgent ?? null;
    this.deviceFingerprint = props.deviceFingerprint ?? null;
    this.metadata = props.metadata ?? null;
    this.expiresAt = props.expiresAt;
    this._verifiedAt = props.verifiedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get attempts(): number {
    return this._attempts;
  }

  get status(): VerificationStatus {
    return this._status;
  }

  get verifiedAt(): Date | null {
    return this._verifiedAt;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isPending(): boolean {
    return this._status === VerificationStatus.PENDING;
  }

  get canAttempt(): boolean {
    return (
      this.isPending && !this.isExpired && this._attempts < this.maxAttempts
    );
  }

  incrementAttempts(): void {
    this._attempts++;
    if (this._attempts >= this.maxAttempts) {
      this._status = VerificationStatus.FAILED;
    }
  }

  markVerified(): void {
    this._status = VerificationStatus.VERIFIED;
    this._verifiedAt = new Date();
  }

  markExpired(): void {
    this._status = VerificationStatus.EXPIRED;
  }

  markFailed(): void {
    this._status = VerificationStatus.FAILED;
  }

  static create(props: CreateVerificationProps): Verification {
    return new Verification({
      ...props,
      identifierType: props.identifierType ?? VerificationIdentifierType.PHONE,
      status: VerificationStatus.PENDING,
      attempts: 0,
    });
  }

  static reconstitute(props: VerificationProps): Verification {
    return new Verification(props);
  }
}
