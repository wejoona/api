import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FeatureFlagRepository } from '../../domain/repositories/feature-flag.repository';
import {
  FeatureFlag,
  EvaluationContext,
} from '../../domain/entities/feature-flag.entity';

export interface FeatureFlagResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  enabledUserIds: string[];
  disabledUserIds: string[];
  enabledCountries: string[];
  minAppVersion: string | null;
  platforms: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateFeatureFlagParams {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  enabledUserIds?: string[];
  disabledUserIds?: string[];
  enabledCountries?: string[];
  minAppVersion?: string | null;
  platforms?: string[];
  startsAt?: Date | null;
  endsAt?: Date | null;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cacheTtl = 300; // 5 minutes
  private readonly cacheKey = 'feature_flags';
  private flagsCache: Map<string, FeatureFlag> = new Map();

  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  /**
   * Check if a feature is enabled for a given context.
   * Uses in-memory cache for fast lookups.
   */
  async isEnabled(key: string, context: EvaluationContext = {}): Promise<boolean> {
    // Check in-memory cache first
    let flag = this.flagsCache.get(key);

    if (!flag) {
      // Fallback to database
      flag = await this.featureFlagRepository.findByKey(key);
      if (flag) {
        this.flagsCache.set(key, flag);
      }
    }

    if (!flag) {
      // Feature flag doesn't exist - default to disabled
      this.logger.warn(`Feature flag "${key}" not found, defaulting to disabled`);
      return false;
    }

    return flag.evaluate(context);
  }

  /**
   * Get all feature flags (admin).
   */
  async getAllFlags(): Promise<FeatureFlagResponse[]> {
    const flags = await this.featureFlagRepository.findAll();
    return flags.map(this.toResponse);
  }

  /**
   * Get enabled feature flags.
   */
  async getEnabledFlags(): Promise<FeatureFlagResponse[]> {
    const flags = await this.featureFlagRepository.findEnabled();
    return flags.map(this.toResponse);
  }

  /**
   * Get a feature flag by key.
   */
  async getFlag(key: string): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findByKey(key);
    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }
    return flag;
  }

  /**
   * Create a new feature flag (admin).
   */
  async createFlag(
    key: string,
    name: string,
    description?: string,
  ): Promise<FeatureFlag> {
    const existing = await this.featureFlagRepository.findByKey(key);
    if (existing) {
      throw new ConflictException(`Feature flag "${key}" already exists`);
    }

    const flag = FeatureFlag.create({
      key,
      name,
      description,
      isEnabled: false,
      rolloutPercentage: 0,
    });

    const saved = await this.featureFlagRepository.save(flag);
    await this.refreshCache();

    this.logger.log(`Created feature flag "${key}"`);
    return saved;
  }

  /**
   * Update a feature flag (admin).
   */
  async updateFlag(
    key: string,
    params: UpdateFeatureFlagParams,
  ): Promise<FeatureFlag> {
    const flag = await this.getFlag(key);

    if (params.isEnabled !== undefined) {
      if (params.isEnabled) {
        flag.enable();
      } else {
        flag.disable();
      }
    }

    if (params.rolloutPercentage !== undefined) {
      flag.setRolloutPercentage(params.rolloutPercentage);
    }

    if (params.enabledCountries !== undefined) {
      flag.setCountries(params.enabledCountries);
    }

    if (params.platforms !== undefined) {
      flag.setPlatforms(params.platforms);
    }

    if (params.minAppVersion !== undefined) {
      flag.setMinAppVersion(params.minAppVersion);
    }

    if (params.startsAt !== undefined || params.endsAt !== undefined) {
      flag.setTimeWindow(
        params.startsAt ?? flag.startsAt,
        params.endsAt ?? flag.endsAt,
      );
    }

    const saved = await this.featureFlagRepository.save(flag);
    await this.refreshCache();

    this.logger.log(`Updated feature flag "${key}"`);
    return saved;
  }

  /**
   * Enable a feature flag for a specific user (admin).
   */
  async enableForUser(key: string, userId: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(key);
    flag.addEnabledUser(userId);

    const saved = await this.featureFlagRepository.save(flag);
    await this.refreshCache();

    this.logger.log(`Enabled feature flag "${key}" for user ${userId}`);
    return saved;
  }

  /**
   * Disable a feature flag for a specific user (admin).
   */
  async disableForUser(key: string, userId: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(key);
    flag.addDisabledUser(userId);

    const saved = await this.featureFlagRepository.save(flag);
    await this.refreshCache();

    this.logger.log(`Disabled feature flag "${key}" for user ${userId}`);
    return saved;
  }

  /**
   * Remove user override for a feature flag (admin).
   */
  async removeUserOverride(key: string, userId: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(key);
    flag.removeUserOverride(userId);

    const saved = await this.featureFlagRepository.save(flag);
    await this.refreshCache();

    this.logger.log(`Removed user override for feature flag "${key}"`);
    return saved;
  }

  /**
   * Delete a feature flag (admin).
   */
  async deleteFlag(key: string): Promise<void> {
    const flag = await this.featureFlagRepository.findByKey(key);
    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    await this.featureFlagRepository.delete(key);
    await this.refreshCache();

    this.logger.log(`Deleted feature flag "${key}"`);
  }

  /**
   * Refresh the in-memory cache from database.
   */
  async refreshCache(): Promise<void> {
    try {
      const flags = await this.featureFlagRepository.findAll();
      this.flagsCache.clear();
      for (const flag of flags) {
        this.flagsCache.set(flag.key, flag);
      }
      this.logger.log(`Refreshed feature flags cache: ${flags.length} flags`);
    } catch (error) {
      this.logger.error('Failed to refresh feature flags cache', error);
    }
  }

  /**
   * Get all feature flag statuses for a user context.
   * Useful for mobile app initialization.
   */
  async getEnabledFlagsForContext(
    context: EvaluationContext,
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    for (const [key, flag] of this.flagsCache.entries()) {
      result[key] = flag.evaluate(context);
    }

    return result;
  }

  private toResponse(flag: FeatureFlag): FeatureFlagResponse {
    return {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      isEnabled: flag.isEnabled,
      rolloutPercentage: flag.rolloutPercentage,
      enabledUserIds: flag.enabledUserIds,
      disabledUserIds: flag.disabledUserIds,
      enabledCountries: flag.enabledCountries,
      minAppVersion: flag.minAppVersion,
      platforms: flag.platforms,
      startsAt: flag.startsAt,
      endsAt: flag.endsAt,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    };
  }
}
