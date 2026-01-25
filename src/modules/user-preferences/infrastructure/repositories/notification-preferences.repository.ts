import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { NotificationPreferences } from '../../application/domain/entities';
import { NotificationPreferencesOrmEntity } from '../orm-entities';
import { NotificationPreferencesMapper } from '../mappers';

@Injectable()
export class NotificationPreferencesRepository {
  private readonly CACHE_TTL = 600; // 10 minutes in seconds

  constructor(
    @InjectRepository(NotificationPreferencesOrmEntity)
    private readonly ormRepository: Repository<NotificationPreferencesOrmEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Save notification preferences
   */
  async save(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const ormEntity = NotificationPreferencesMapper.toOrm(preferences);
    const saved = await this.ormRepository.save(ormEntity);
    const domain = NotificationPreferencesMapper.toDomain(saved);

    // Invalidate cache on save
    await this.invalidateCache(domain.userId);

    return domain;
  }

  /**
   * Find preferences by user ID
   */
  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    const cacheKey = this.getCacheKey(userId);

    // Try to get from cache first
    const cached = await this.cacheManager.get<NotificationPreferences>(cacheKey);
    if (cached) {
      // Reconstitute from cache (plain object to class instance)
      return NotificationPreferences.reconstitute(cached);
    }

    // Cache miss - fetch from database
    const orm = await this.ormRepository.findOne({ where: { userId } });
    if (!orm) {
      return null;
    }

    const preferences = NotificationPreferencesMapper.toDomain(orm);

    // Cache the result
    await this.cacheManager.set(cacheKey, preferences, this.CACHE_TTL);

    return preferences;
  }

  /**
   * Check if preferences exist for a user
   */
  async existsForUser(userId: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { userId } });
    return count > 0;
  }

  /**
   * Delete preferences by user ID
   */
  async deleteByUserId(userId: string): Promise<void> {
    await this.ormRepository.delete({ userId });
    await this.invalidateCache(userId);
  }

  /**
   * Get or create preferences for a user
   * Creates default preferences if none exist
   */
  async getOrCreate(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.findByUserId(userId);

    if (!preferences) {
      preferences = NotificationPreferences.create({ userId });
      preferences = await this.save(preferences);
    }

    return preferences;
  }

  /**
   * Get cache key for user preferences
   */
  private getCacheKey(userId: string): string {
    return `notification_preferences:${userId}`;
  }

  /**
   * Invalidate cache for a user
   */
  private async invalidateCache(userId: string): Promise<void> {
    await this.cacheManager.del(this.getCacheKey(userId));
  }
}
