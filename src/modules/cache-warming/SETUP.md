# Cache Warming Setup Guide

Quick setup guide to integrate cache warming into your JoonaPay backend.

## Prerequisites

- Redis instance running
- NestJS application with `@nestjs/cache-manager` installed
- Feature flag module configured
- Yellow Card API credentials

## Step 1: Install Dependencies

```bash
cd usdc-wallet
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet @nestjs/schedule
```

## Step 2: Configure Redis

Add Redis configuration to your `.env`:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@localhost:6379

# Cache TTLs (optional)
CACHE_EXCHANGE_RATE_TTL=300
CACHE_FEATURE_FLAG_TTL=300
CACHE_COUNTRY_CONFIG_TTL=3600
CACHE_APP_CONFIG_TTL=3600
```

## Step 3: Update App Module

Import the cache warming module in your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheWarmingModule } from './modules/cache-warming/cache-warming.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Configure Redis cache globally
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
          },
          password: configService.get('REDIS_PASSWORD'),
          ttl: 300 * 1000, // 5 minutes default
        }),
      }),
    }),

    // Import cache warming module
    CacheWarmingModule,

    // ... other modules
  ],
})
export class AppModule {}
```

## Step 4: Configure Application Settings

Ensure your `config/configuration.ts` includes required settings:

```typescript
export default () => ({
  app: {
    supportedCountries: ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'US'],
    supportedCurrencies: ['XOF', 'USD', 'USDC'],
    minDepositAmount: 100,
    maxDepositAmount: 1000000,
    minTransferAmount: 50,
    maxTransferAmount: 500000,
    internalTransferFeePercent: 0,
    externalTransferFeePercent: 1.5,
    defaultCountry: 'CI',
    defaultCurrency: 'XOF',
  },
  compliance: {
    largeTransactionThreshold: 100000,
    autoFlagVelocityThreshold: 10,
    structuringTimeWindow: 3600,
  },
  kyc: {
    autoApprovalEnabled: true,
    autoApprovalThreshold: 0.85,
    autoRejectThreshold: 0.3,
  },
  otp: {
    expiresIn: 300,
    maxAttempts: 3,
    useDevOtp: process.env.NODE_ENV !== 'production',
  },
});
```

## Step 5: Verify Installation

Start your application and check logs:

```bash
npm run start:dev
```

You should see:
```
[CacheWarmingService] 🔥 Starting cache warming...
[CacheWarmingService] Exchange rates warmed: 6/6 pairs in 234ms
[CacheWarmingService] Feature flags warmed: 15 flags in 87ms
[CacheWarmingService] Country configs warmed: 8 countries in 45ms
[CacheWarmingService] App config warmed in 12ms
[CacheWarmingService] ✅ Cache warming completed in 378ms (4 successful, 0 failed)
```

## Step 6: Test Admin Endpoints

Get authentication token (admin user):
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@joonapay.com","password":"your_password"}' \
  | jq -r '.accessToken')
```

Test cache status:
```bash
curl http://localhost:3000/admin/cache/status \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "isWarming": false,
  "lastWarmed": "2025-01-30T10:30:00.000Z",
  "stats": {
    "exchangeRates": 6,
    "featureFlags": 15,
    "countries": 8,
    "appConfigCached": true,
    "totalCachedKeys": 35
  },
  "health": {
    "exchangeRates": "healthy",
    "featureFlags": "healthy",
    "countries": "healthy",
    "appConfig": "healthy"
  }
}
```

## Step 7: Add Health Check (Optional)

Update your health controller:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { CacheWarmingHealthIndicator } from './modules/cache-warming/infrastructure/health-indicators/cache-warming.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private cacheWarmingHealth: CacheWarmingHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.cacheWarmingHealth.isHealthy('cache-warming'),
    ]);
  }
}
```

## Step 8: Configure Monitoring (Recommended)

Add Prometheus metrics (if using):

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register(),
    // ... other modules
  ],
})
export class AppModule {}
```

## Step 9: Configure Cron Jobs

The module automatically schedules cache warming every 5 minutes. To customize:

```typescript
// cache-warming.service.ts
@Cron('0 */10 * * * *') // Every 10 minutes
async scheduledCacheWarming() {
  await this.warmAllCaches();
}
```

## Step 10: Test in Production

### Pre-deployment Checklist
- [ ] Redis is accessible from production environment
- [ ] Redis has sufficient memory (recommend 256MB minimum)
- [ ] Yellow Card API credentials are configured
- [ ] Feature flags are populated in database
- [ ] Admin endpoints are protected with proper authentication
- [ ] Monitoring/alerting is configured

### Deploy
```bash
# Build
npm run build

# Deploy to production
pm2 start dist/main.js --name joonapay-api

# Monitor logs
pm2 logs joonapay-api | grep "Cache warming"
```

### Post-deployment Verification
```bash
# Check cache status
curl https://api.joonapay.com/admin/cache/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verify Redis keys
redis-cli
> KEYS rate:*
> KEYS feature_flag:*
> KEYS country:*
```

## Troubleshooting

### Cache Not Warming

**Issue:** No cache warming logs on startup

**Solution:**
1. Check Redis connection:
   ```bash
   redis-cli -h localhost -p 6379 ping
   ```

2. Verify module is imported:
   ```typescript
   // app.module.ts should include:
   imports: [CacheWarmingModule]
   ```

3. Check for errors in logs:
   ```bash
   grep -i "error" logs/application.log | grep -i cache
   ```

### Slow Warming

**Issue:** Cache warming takes >5 seconds

**Solution:**
1. Check Yellow Card API latency:
   ```bash
   curl -w "@curl-format.txt" https://api.yellowcard.io/rates
   ```

2. Optimize by reducing concurrent API calls
3. Increase Redis connection timeout
4. Consider using local mock data for non-production

### Memory Issues

**Issue:** Redis running out of memory

**Solution:**
1. Check Redis memory usage:
   ```bash
   redis-cli INFO memory
   ```

2. Reduce TTL for less critical data
3. Remove unused cache keys
4. Increase Redis maxmemory

### Low Hit Rate

**Issue:** Cache hit rate <70%

**Solution:**
1. Increase warming frequency
2. Add more data to warming strategy
3. Review cache invalidation patterns
4. Increase TTL for stable data

## Performance Tuning

### Optimal Configuration

```env
# Production settings
CACHE_EXCHANGE_RATE_TTL=300        # 5 min - frequently updated
CACHE_FEATURE_FLAG_TTL=600         # 10 min - semi-stable
CACHE_COUNTRY_CONFIG_TTL=3600      # 1 hour - very stable
CACHE_APP_CONFIG_TTL=3600          # 1 hour - very stable

# Redis settings
REDIS_MAX_MEMORY=512mb
REDIS_EVICTION_POLICY=allkeys-lru
```

### Monitoring Metrics

Key metrics to monitor:
- **Cache Hit Rate**: >90%
- **Warming Duration**: <2 seconds
- **Redis Memory**: <80% of max
- **API Latency**: <200ms

## Next Steps

1. **Set up monitoring dashboards** - Grafana/Kibana
2. **Configure alerts** - Low hit rate, failed warming
3. **Optimize based on usage** - Adjust TTLs and warming frequency
4. **Review performance reports** - Weekly analysis

## Support

- Documentation: `/usdc-wallet/src/modules/cache-warming/README.md`
- Examples: `/usdc-wallet/src/modules/cache-warming/examples/`
- Tests: `/usdc-wallet/src/modules/cache-warming/**/__tests__/`

For issues, contact the backend team or create a ticket.
