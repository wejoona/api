import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface FeatureFlagProps {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  enabledUserIds?: string[];
  disabledUserIds?: string[];
  enabledCountries?: string[];
  minAppVersion?: string | null;
  platforms?: string[];
  startsAt?: Date | null;
  endsAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateFeatureFlagProps {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
}

export interface EvaluationContext {
  userId?: string;
  countryCode?: string;
  appVersion?: string;
  platform?: string;
}

export class FeatureFlag {
  readonly id: string;
  readonly key: string;
  private _name: string;
  private _description: string | null;
  private _isEnabled: boolean;
  private _rolloutPercentage: number;
  private _enabledUserIds: string[];
  private _disabledUserIds: string[];
  private _enabledCountries: string[];
  private _minAppVersion: string | null;
  private _platforms: string[];
  private _startsAt: Date | null;
  private _endsAt: Date | null;
  private _metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: FeatureFlagProps) {
    this.id = props.id || uuidv4();
    this.key = props.key;
    this._name = props.name;
    this._description = props.description ?? null;
    this._isEnabled = props.isEnabled ?? false;
    this._rolloutPercentage = props.rolloutPercentage ?? 0;
    this._enabledUserIds = props.enabledUserIds ?? [];
    this._disabledUserIds = props.disabledUserIds ?? [];
    this._enabledCountries = props.enabledCountries ?? [];
    this._minAppVersion = props.minAppVersion ?? null;
    this._platforms = props.platforms ?? [];
    this._startsAt = props.startsAt ?? null;
    this._endsAt = props.endsAt ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  get rolloutPercentage(): number {
    return this._rolloutPercentage;
  }

  get enabledUserIds(): string[] {
    return [...this._enabledUserIds];
  }

  get disabledUserIds(): string[] {
    return [...this._disabledUserIds];
  }

  get enabledCountries(): string[] {
    return [...this._enabledCountries];
  }

  get minAppVersion(): string | null {
    return this._minAppVersion;
  }

  get platforms(): string[] {
    return [...this._platforms];
  }

  get startsAt(): Date | null {
    return this._startsAt;
  }

  get endsAt(): Date | null {
    return this._endsAt;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  /**
   * Evaluate if the feature is enabled for a given context.
   */
  evaluate(context: EvaluationContext = {}): boolean {
    // If globally disabled, return false
    if (!this._isEnabled) {
      return false;
    }

    // Check time window
    const now = new Date();
    if (this._startsAt && now < this._startsAt) {
      return false;
    }
    if (this._endsAt && now > this._endsAt) {
      return false;
    }

    // Check if user is explicitly disabled
    if (context.userId && this._disabledUserIds.includes(context.userId)) {
      return false;
    }

    // Check if user is explicitly enabled
    if (context.userId && this._enabledUserIds.includes(context.userId)) {
      return true;
    }

    // Check country restrictions
    if (this._enabledCountries.length > 0) {
      if (!context.countryCode || !this._enabledCountries.includes(context.countryCode)) {
        return false;
      }
    }

    // Check platform restrictions
    if (this._platforms.length > 0) {
      if (!context.platform || !this._platforms.includes(context.platform)) {
        return false;
      }
    }

    // Check minimum app version
    if (this._minAppVersion && context.appVersion) {
      if (!this.isVersionAtLeast(context.appVersion, this._minAppVersion)) {
        return false;
      }
    }

    // Check percentage rollout
    if (this._rolloutPercentage < 100 && context.userId) {
      const bucket = this.getUserBucket(context.userId);
      if (bucket >= this._rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a deterministic bucket (0-99) for a user based on feature key.
   */
  private getUserBucket(userId: string): number {
    const hash = crypto
      .createHash('md5')
      .update(`${this.key}:${userId}`)
      .digest('hex');
    // Take first 8 chars of hash and convert to number, then mod 100
    const num = parseInt(hash.substring(0, 8), 16);
    return num % 100;
  }

  /**
   * Compare semver versions.
   */
  private isVersionAtLeast(version: string, minVersion: string): boolean {
    const v1Parts = version.split('.').map((p) => parseInt(p, 10));
    const v2Parts = minVersion.split('.').map((p) => parseInt(p, 10));

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }

    return true;
  }

  enable(): void {
    this._isEnabled = true;
  }

  disable(): void {
    this._isEnabled = false;
  }

  setRolloutPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    this._rolloutPercentage = percentage;
  }

  addEnabledUser(userId: string): void {
    if (!this._enabledUserIds.includes(userId)) {
      this._enabledUserIds.push(userId);
    }
    // Remove from disabled if present
    this._disabledUserIds = this._disabledUserIds.filter((id) => id !== userId);
  }

  addDisabledUser(userId: string): void {
    if (!this._disabledUserIds.includes(userId)) {
      this._disabledUserIds.push(userId);
    }
    // Remove from enabled if present
    this._enabledUserIds = this._enabledUserIds.filter((id) => id !== userId);
  }

  removeUserOverride(userId: string): void {
    this._enabledUserIds = this._enabledUserIds.filter((id) => id !== userId);
    this._disabledUserIds = this._disabledUserIds.filter((id) => id !== userId);
  }

  setCountries(countries: string[]): void {
    this._enabledCountries = countries;
  }

  setPlatforms(platforms: string[]): void {
    this._platforms = platforms;
  }

  setMinAppVersion(version: string | null): void {
    this._minAppVersion = version;
  }

  setTimeWindow(startsAt: Date | null, endsAt: Date | null): void {
    this._startsAt = startsAt;
    this._endsAt = endsAt;
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  static create(props: CreateFeatureFlagProps): FeatureFlag {
    return new FeatureFlag({
      ...props,
      isEnabled: props.isEnabled ?? false,
      rolloutPercentage: props.rolloutPercentage ?? 0,
    });
  }

  static reconstitute(props: FeatureFlagProps): FeatureFlag {
    return new FeatureFlag(props);
  }
}
