import { v4 as uuidv4 } from 'uuid';

export interface SessionProps {
  id?: string;
  userId: string;
  deviceId?: string | null;
  refreshTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
  isActive?: boolean;
  lastActivityAt?: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSessionProps {
  userId: string;
  deviceId?: string | null;
  refreshTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
  expiresAt: Date;
}

export class Session {
  readonly id: string;
  readonly userId: string;
  private _deviceId: string | null;
  readonly refreshTokenHash: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly location: string | null;
  private _isActive: boolean;
  private _lastActivityAt: Date;
  readonly expiresAt: Date;
  private _revokedAt: Date | null;
  private _revokedReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SessionProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this._deviceId = props.deviceId ?? null;
    this.refreshTokenHash = props.refreshTokenHash;
    this.ipAddress = props.ipAddress ?? null;
    this.userAgent = props.userAgent ?? null;
    this.location = props.location ?? null;
    this._isActive = props.isActive ?? true;
    this._lastActivityAt = props.lastActivityAt ?? new Date();
    this.expiresAt = props.expiresAt;
    this._revokedAt = props.revokedAt ?? null;
    this._revokedReason = props.revokedReason ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get deviceId(): string | null {
    return this._deviceId;
  }

  get lastActivityAt(): Date {
    return this._lastActivityAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get revokedReason(): string | null {
    return this._revokedReason;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return this._isActive && !this.isExpired;
  }

  recordActivity(): void {
    this._lastActivityAt = new Date();
  }

  attachDevice(deviceId: string): void {
    this._deviceId = deviceId;
    this.recordActivity();
  }

  revoke(reason?: string): void {
    this._isActive = false;
    this._revokedAt = new Date();
    this._revokedReason = reason ?? 'user_logout';
  }

  static create(props: CreateSessionProps): Session {
    return new Session({
      ...props,
      isActive: true,
      lastActivityAt: new Date(),
    });
  }

  static reconstitute(props: SessionProps): Session {
    return new Session(props);
  }
}
