import { Module, OnModuleInit } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheWarmingService } from './application/services/cache-warming.service';
import { CacheWarmingController } from './application/controllers/cache-warming.controller';
import { FeatureFlagModule } from '../feature-flag/feature-flag.module';
import { SharedModule } from '../shared/shared.module';

/**
 * Cache Warming Module
 *
 * Pre-populates Redis cache on application startup with frequently accessed data:
 * - Exchange rates (XOF/USD/USDC conversions)
 * - Feature flags (all flags for fast evaluation)
 * - Country configurations (supported countries and currencies)
 * - Application configuration (limits, fees, thresholds)
 *
 * This reduces database queries and improves response times for critical operations.
 *
 * Features:
 * - Automatic warming on application startup
 * - Scheduled warming every 5 minutes (configurable)
 * - Admin API endpoints for manual cache control
 * - Cache statistics and health monitoring
 * - Selective warming by category (rates, flags, config)
 */
@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
    }),
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
    FeatureFlagModule,
    SharedModule,
  ],
  controllers: [CacheWarmingController],
  providers: [CacheWarmingService],
  exports: [CacheWarmingService],
})
export class CacheWarmingModule implements OnModuleInit {
  constructor(private readonly cacheWarmingService: CacheWarmingService) {}

  async onModuleInit() {
    // Warm cache on application startup
    await this.cacheWarmingService.warmAllCaches();
  }
}
