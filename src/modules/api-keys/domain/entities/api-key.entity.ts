import { v4 as uuidv4 } from 'uuid';

export interface ApiKeyProps {
  id?: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  userId?: string | null;
  isActive: boolean;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  usageCount: number;
  ipWhitelist?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateApiKeyProps {
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions?: string[];
  rateLimit?: number;
  userId?: string | null;
  expiresAt?: Date | null;
  ipWhitelist?: string[] | null;
}

export class ApiKey {
  readonly id: string;
  readonly name: string;
  readonly keyHash: string;
  readonly keyPrefix: string;
  readonly permissions: string[];
  readonly rateLimit: number;
  readonly userId: string | null;
  readonly isActive: boolean;
  readonly expiresAt: Date | null;
  readonly lastUsedAt: Date | null;
  readonly usageCount: number;
  readonly ipWhitelist: string[] | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ApiKeyProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.keyHash = props.keyHash;
    this.keyPrefix = props.keyPrefix;
    this.permissions = props.permissions;
    this.rateLimit = props.rateLimit;
    this.userId = props.userId || null;
    this.isActive = props.isActive;
    this.expiresAt = props.expiresAt || null;
    this.lastUsedAt = props.lastUsedAt || null;
    this.usageCount = props.usageCount;
    this.ipWhitelist = props.ipWhitelist || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(props: CreateApiKeyProps): ApiKey {
    return new ApiKey({
      name: props.name,
      keyHash: props.keyHash,
      keyPrefix: props.keyPrefix,
      permissions: props.permissions || [],
      rateLimit: props.rateLimit || 60,
      userId: props.userId || null,
      isActive: true,
      expiresAt: props.expiresAt || null,
      lastUsedAt: null,
      usageCount: 0,
      ipWhitelist: props.ipWhitelist || null,
    });
  }

  static fromPersistence(props: ApiKeyProps): ApiKey {
    return new ApiKey(props);
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  isIpAllowed(ip: string): boolean {
    if (!this.ipWhitelist || this.ipWhitelist.length === 0) return true;
    return this.ipWhitelist.includes(ip);
  }

  hasPermission(permission: string): boolean {
    if (this.permissions.includes('*')) return true;
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (this.permissions.includes('*')) return true;
    return permissions.some((p) => this.permissions.includes(p));
  }

  withUpdatedUsage(): ApiKey {
    return new ApiKey({
      ...this.toProps(),
      lastUsedAt: new Date(),
      usageCount: this.usageCount + 1,
      updatedAt: new Date(),
    });
  }

  withDeactivated(): ApiKey {
    return new ApiKey({
      ...this.toProps(),
      isActive: false,
      updatedAt: new Date(),
    });
  }

  private toProps(): ApiKeyProps {
    return {
      id: this.id,
      name: this.name,
      keyHash: this.keyHash,
      keyPrefix: this.keyPrefix,
      permissions: this.permissions,
      rateLimit: this.rateLimit,
      userId: this.userId,
      isActive: this.isActive,
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
      usageCount: this.usageCount,
      ipWhitelist: this.ipWhitelist,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
