import { v4 as uuidv4 } from 'uuid';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export interface DeviceProps {
  id?: string;
  userId: string;
  deviceIdentifier: string;
  brand?: string | null;
  model?: string | null;
  os?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
  platform?: DevicePlatform;
  fcmToken?: string | null;
  isTrusted?: boolean;
  trustedAt?: Date | null;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  lastIpAddress?: string | null;
  loginCount?: number;
  publicKeyJwk?: Record<string, unknown> | null;
  deviceName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDeviceProps {
  userId: string;
  deviceIdentifier: string;
  brand?: string | null;
  model?: string | null;
  os?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
  platform?: DevicePlatform;
  fcmToken?: string | null;
  ipAddress?: string | null;
  publicKeyJwk?: Record<string, unknown> | null;
  deviceName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class Device {
  readonly id: string;
  readonly userId: string;
  readonly deviceIdentifier: string;
  readonly brand: string | null;
  readonly model: string | null;
  readonly os: string | null;
  readonly osVersion: string | null;
  private _appVersion: string | null;
  readonly platform: DevicePlatform;
  private _fcmToken: string | null;
  private _isTrusted: boolean;
  private _trustedAt: Date | null;
  private _isActive: boolean;
  private _lastLoginAt: Date | null;
  private _lastIpAddress: string | null;
  private _loginCount: number;
  private _publicKeyJwk: Record<string, unknown> | null;
  private _deviceName: string | null;
  private _metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DeviceProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this.deviceIdentifier = props.deviceIdentifier;
    this.brand = props.brand ?? null;
    this.model = props.model ?? null;
    this.os = props.os ?? null;
    this.osVersion = props.osVersion ?? null;
    this._appVersion = props.appVersion ?? null;
    this.platform = props.platform ?? DevicePlatform.ANDROID;
    this._fcmToken = props.fcmToken ?? null;
    this._isTrusted = props.isTrusted ?? false;
    this._trustedAt = props.trustedAt ?? null;
    this._isActive = props.isActive ?? true;
    this._lastLoginAt = props.lastLoginAt ?? null;
    this._lastIpAddress = props.lastIpAddress ?? null;
    this._loginCount = props.loginCount ?? 0;
    this._publicKeyJwk = props.publicKeyJwk ?? null;
    this._deviceName = props.deviceName ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get appVersion(): string | null {
    return this._appVersion;
  }

  get fcmToken(): string | null {
    return this._fcmToken;
  }

  get isTrusted(): boolean {
    return this._isTrusted;
  }

  get trustedAt(): Date | null {
    return this._trustedAt;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  get lastIpAddress(): string | null {
    return this._lastIpAddress;
  }

  get loginCount(): number {
    return this._loginCount;
  }

  get publicKeyJwk(): Record<string, unknown> | null {
    return this._publicKeyJwk;
  }

  get deviceName(): string | null {
    return this._deviceName;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  get displayName(): string {
    if (this.brand && this.model) {
      return `${this.brand} ${this.model}`;
    }
    if (this.brand) {
      return this.brand;
    }
    if (this.model) {
      return this.model;
    }
    return `${this.platform} device`;
  }

  trust(): void {
    this._isTrusted = true;
    this._trustedAt = new Date();
  }

  untrust(): void {
    this._isTrusted = false;
    this._trustedAt = null;
  }

  deactivate(): void {
    this._isActive = false;
  }

  activate(): void {
    this._isActive = true;
  }

  recordLogin(ipAddress?: string): void {
    this._lastLoginAt = new Date();
    this._loginCount++;
    if (ipAddress) {
      this._lastIpAddress = ipAddress;
    }
  }

  updateFcmToken(token: string | null): void {
    this._fcmToken = token;
  }

  updateAppVersion(version: string): void {
    this._appVersion = version;
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  setPublicKey(jwk: Record<string, unknown>): void {
    this._publicKeyJwk = jwk;
  }

  rename(name: string): void {
    this._deviceName = name;
  }

  get hasPublicKey(): boolean {
    return this._publicKeyJwk !== null;
  }

  static create(props: CreateDeviceProps): Device {
    return new Device({
      ...props,
      lastLoginAt: new Date(),
      lastIpAddress: props.ipAddress,
      loginCount: 1,
    });
  }

  static reconstitute(props: DeviceProps): Device {
    return new Device(props);
  }
}
