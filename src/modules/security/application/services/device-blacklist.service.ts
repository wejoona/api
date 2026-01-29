import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlacklistedDeviceOrmEntity } from '../../infrastructure/orm-entities/blacklisted-device.orm-entity';

export interface BlacklistDeviceInput {
  deviceFingerprint: string;
  identifierType:
    | 'device_id'
    | 'fingerprint'
    | 'ip_address'
    | 'ip_range'
    | 'user_agent';
  reason: string;
  blacklistedBy: string;
  associatedUserId?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeviceCheckResult {
  isBlacklisted: boolean;
  reason?: string;
  blacklistedAt?: Date;
  expiresAt?: Date | null;
}

@Injectable()
export class DeviceBlacklistService {
  private readonly logger = new Logger(DeviceBlacklistService.name);

  // In-memory cache for frequently checked devices (improves performance)
  private blacklistCache: Map<
    string,
    { isBlacklisted: boolean; expiresAt: number }
  > = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(
    @InjectRepository(BlacklistedDeviceOrmEntity)
    private readonly blacklistRepository: Repository<BlacklistedDeviceOrmEntity>,
  ) {}

  /**
   * Check if a device is blacklisted
   */
  async isDeviceBlacklisted(
    deviceFingerprint: string,
    identifierType?: string,
  ): Promise<DeviceCheckResult> {
    // Check cache first
    const cacheKey = `${deviceFingerprint}:${identifierType || 'any'}`;
    const cached = this.blacklistCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      if (cached.isBlacklisted) {
        // Increment blocked attempts asynchronously
        this.incrementBlockedAttempts(deviceFingerprint).catch(() => {});
      }
      return { isBlacklisted: cached.isBlacklisted };
    }

    // Query database
    const queryBuilder = this.blacklistRepository
      .createQueryBuilder('device')
      .where('device.device_fingerprint = :fingerprint', {
        fingerprint: deviceFingerprint,
      })
      .andWhere('device.is_active = :active', { active: true })
      .andWhere('(device.expires_at IS NULL OR device.expires_at > :now)', {
        now: new Date(),
      });

    if (identifierType) {
      queryBuilder.andWhere('device.identifier_type = :type', {
        type: identifierType,
      });
    }

    const blacklistedDevice = await queryBuilder.getOne();

    // Update cache
    this.blacklistCache.set(cacheKey, {
      isBlacklisted: !!blacklistedDevice,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    if (blacklistedDevice) {
      // Increment blocked attempts
      await this.incrementBlockedAttempts(deviceFingerprint);

      return {
        isBlacklisted: true,
        reason: blacklistedDevice.reason,
        blacklistedAt: blacklistedDevice.createdAt,
        expiresAt: blacklistedDevice.expiresAt,
      };
    }

    return { isBlacklisted: false };
  }

  /**
   * Check multiple identifiers at once (device ID, IP, fingerprint)
   */
  async checkMultipleIdentifiers(identifiers: {
    deviceId?: string;
    ipAddress?: string;
    fingerprint?: string;
    userAgent?: string;
  }): Promise<DeviceCheckResult> {
    const checks: Promise<DeviceCheckResult>[] = [];

    if (identifiers.deviceId) {
      checks.push(this.isDeviceBlacklisted(identifiers.deviceId, 'device_id'));
    }
    if (identifiers.ipAddress) {
      checks.push(
        this.isDeviceBlacklisted(identifiers.ipAddress, 'ip_address'),
      );
      // Also check IP ranges
      checks.push(this.checkIpRange(identifiers.ipAddress));
    }
    if (identifiers.fingerprint) {
      checks.push(
        this.isDeviceBlacklisted(identifiers.fingerprint, 'fingerprint'),
      );
    }
    if (identifiers.userAgent) {
      checks.push(
        this.isDeviceBlacklisted(identifiers.userAgent, 'user_agent'),
      );
    }

    const results = await Promise.all(checks);
    const blacklisted = results.find((r) => r.isBlacklisted);

    return blacklisted || { isBlacklisted: false };
  }

  /**
   * Check if IP is in a blacklisted range
   */
  private async checkIpRange(ipAddress: string): Promise<DeviceCheckResult> {
    // Get all IP range blacklist entries
    const ranges = await this.blacklistRepository.find({
      where: {
        identifierType: 'ip_range',
        isActive: true,
      },
    });

    for (const range of ranges) {
      if (this.isIpInRange(ipAddress, range.deviceFingerprint)) {
        await this.incrementBlockedAttempts(range.deviceFingerprint);
        return {
          isBlacklisted: true,
          reason: range.reason,
          blacklistedAt: range.createdAt,
          expiresAt: range.expiresAt,
        };
      }
    }

    return { isBlacklisted: false };
  }

  /**
   * Simple CIDR range check
   */
  private isIpInRange(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      if (!bits) return ip === range;

      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);

      return (ipNum & mask) === (rangeNum & mask);
    } catch {
      return false;
    }
  }

  private ipToNumber(ip: string): number {
    return (
      ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>>
      0
    );
  }

  /**
   * Add a device to the blacklist
   */
  async blacklistDevice(
    input: BlacklistDeviceInput,
  ): Promise<BlacklistedDeviceOrmEntity> {
    // Check if already blacklisted
    const existing = await this.blacklistRepository.findOne({
      where: {
        deviceFingerprint: input.deviceFingerprint,
        identifierType: input.identifierType,
        isActive: true,
      },
    });

    if (existing) {
      // Update existing entry
      existing.reason = input.reason;
      existing.blacklistedBy = input.blacklistedBy;
      existing.expiresAt = input.expiresAt || null;
      existing.metadata = { ...existing.metadata, ...input.metadata };

      // Invalidate cache
      this.invalidateCache(input.deviceFingerprint);

      return this.blacklistRepository.save(existing);
    }

    // Create new entry
    const device = this.blacklistRepository.create({
      deviceFingerprint: input.deviceFingerprint,
      identifierType: input.identifierType,
      reason: input.reason,
      blacklistedBy: input.blacklistedBy,
      associatedUserId: input.associatedUserId || null,
      expiresAt: input.expiresAt || null,
      metadata: input.metadata || null,
      isActive: true,
      blockedAttempts: 0,
    });

    const saved = await this.blacklistRepository.save(device);

    // Invalidate cache
    this.invalidateCache(input.deviceFingerprint);

    this.logger.log(
      `Device blacklisted: ${input.deviceFingerprint} (${input.identifierType}) - ${input.reason}`,
    );

    return saved;
  }

  /**
   * Remove a device from the blacklist
   */
  async unblacklistDevice(
    deviceFingerprint: string,
    removedBy: string,
  ): Promise<boolean> {
    const result = await this.blacklistRepository.update(
      { deviceFingerprint, isActive: true },
      {
        isActive: false,
        metadata: () =>
          `jsonb_set(COALESCE(metadata, '{}'), '{removedBy}', '"${removedBy}"')`,
      },
    );

    // Invalidate cache
    this.invalidateCache(deviceFingerprint);

    if (result.affected && result.affected > 0) {
      this.logger.log(`Device unblacklisted: ${deviceFingerprint}`);
      return true;
    }

    return false;
  }

  /**
   * Get all blacklisted devices (for admin)
   */
  async getBlacklistedDevices(options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    identifierType?: string;
  }): Promise<{ devices: BlacklistedDeviceOrmEntity[]; total: number }> {
    const queryBuilder = this.blacklistRepository.createQueryBuilder('device');

    if (options.activeOnly !== false) {
      queryBuilder.where('device.is_active = :active', { active: true });
    }

    if (options.identifierType) {
      queryBuilder.andWhere('device.identifier_type = :type', {
        type: options.identifierType,
      });
    }

    queryBuilder
      .orderBy('device.created_at', 'DESC')
      .skip(options.offset || 0)
      .take(options.limit || 50);

    const [devices, total] = await queryBuilder.getManyAndCount();

    return { devices, total };
  }

  /**
   * Get blacklist entry by ID
   */
  async getBlacklistEntry(
    id: string,
  ): Promise<BlacklistedDeviceOrmEntity | null> {
    return this.blacklistRepository.findOne({ where: { id } });
  }

  /**
   * Increment blocked attempts counter
   */
  private async incrementBlockedAttempts(
    deviceFingerprint: string,
  ): Promise<void> {
    await this.blacklistRepository
      .createQueryBuilder()
      .update()
      .set({
        blockedAttempts: () => 'blocked_attempts + 1',
        lastBlockedAt: new Date(),
      })
      .where('device_fingerprint = :fingerprint', {
        fingerprint: deviceFingerprint,
      })
      .andWhere('is_active = :active', { active: true })
      .execute();
  }

  /**
   * Invalidate cache entries for a device
   */
  private invalidateCache(deviceFingerprint: string): void {
    for (const key of this.blacklistCache.keys()) {
      if (key.startsWith(deviceFingerprint)) {
        this.blacklistCache.delete(key);
      }
    }
  }

  /**
   * Clean up expired blacklist entries (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredEntries(): Promise<void> {
    const result = await this.blacklistRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Cleaned up ${result.affected} expired blacklist entries`,
      );
    }

    // Clear cache
    this.blacklistCache.clear();
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(): Promise<{
    totalActive: number;
    totalBlocked: number;
    byType: Record<string, number>;
    last24hBlocked: number;
  }> {
    const [totalActive, totalBlocked, byType, last24h] = await Promise.all([
      this.blacklistRepository.count({ where: { isActive: true } }),
      this.blacklistRepository
        .createQueryBuilder('d')
        .select('SUM(d.blocked_attempts)', 'total')
        .getRawOne(),
      this.blacklistRepository
        .createQueryBuilder('d')
        .select('d.identifier_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('d.is_active = :active', { active: true })
        .groupBy('d.identifier_type')
        .getRawMany(),
      this.blacklistRepository
        .createQueryBuilder('d')
        .select('SUM(d.blocked_attempts)', 'total')
        .where('d.last_blocked_at > :since', {
          since: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
        .getRawOne(),
    ]);

    return {
      totalActive,
      totalBlocked: parseInt(totalBlocked?.total || '0'),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      last24hBlocked: parseInt(last24h?.total || '0'),
    };
  }
}
