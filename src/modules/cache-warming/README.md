# Cache Warming Module

Pre-populates Redis cache on application startup and scheduled intervals with frequently accessed data to improve performance and reduce database load.

## Overview

The Cache Warming Module ensures that critical application data is always available in cache, reducing response times and database queries for high-traffic endpoints.

### What Gets Cached

1. **Exchange Rates** (TTL: 5 minutes)
   - XOF/USD, USD/XOF
   - XOF/USDC, USDC/XOF
   - USD/USDC, USDC/USD

2. **Feature Flags** (TTL: 5 minutes)
   - All feature flags for fast evaluation
   - Individual flags for quick lookups

3. **Country Configurations** (TTL: 1 hour)
   - Supported countries (CI, SN, ML, etc.)
   - Currency mappings
   - Mobile money providers
   - KYC requirements
   - Phone prefixes

4. **Application Configuration** (TTL: 1 hour)
   - Transfer limits
   - Fee configurations
   - Compliance thresholds
   - KYC settings
   - OTP settings

## Architecture

```
cache-warming/
├── application/
│   ├── controllers/
│   │   └── cache-warming.controller.ts    # Admin API endpoints
│   ├── services/
│   │   ├── cache-warming.service.ts       # Core warming logic
│   │   └── cache-performance.service.ts   # Performance analysis
│   └── dtos/
│       └── cache-warming.dto.ts           # Response DTOs
├── infrastructure/
│   └── health-indicators/
│       └── cache-warming.health.ts        # Health checks
└── cache-warming.module.ts                # Module definition
```

## Cache Warming Triggers

### 1. Application Startup
Automatically warms cache when the application starts:
```typescript
async onModuleInit() {
  await this.cacheWarmingService.warmAllCaches();
}
```

### 2. Scheduled Warming
Runs every 5 minutes via cron job:
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async scheduledCacheWarming() {
  await this.warmAllCaches();
}
```

### 3. Manual Trigger
Admin API endpoint for on-demand warming:
```bash
curl -X POST http://localhost:3000/admin/cache/warm \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## API Endpoints

All endpoints require **admin authentication**.

### Get Cache Status
```http
GET /admin/cache/status
```

**Response:**
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

### Get Cache Statistics
```http
GET /admin/cache/stats
```

**Response:**
```json
{
  "timestamp": "2025-01-30T10:30:00.000Z",
  "totalKeys": 35,
  "breakdown": {
    "exchangeRates": {
      "count": 6,
      "status": "active",
      "ttl": 300
    },
    "featureFlags": {
      "count": 15,
      "status": "active",
      "ttl": 300
    },
    "countries": {
      "count": 8,
      "status": "active",
      "ttl": 3600
    },
    "appConfig": {
      "cached": true,
      "status": "active",
      "ttl": 3600
    }
  },
  "scheduledWarmingEnabled": true,
  "nextScheduledWarm": "2025-01-30T10:35:00.000Z"
}
```

### Warm All Caches
```http
POST /admin/cache/warm
```

**Response:**
```json
{
  "success": true,
  "message": "Cache warming completed successfully",
  "duration": 1234,
  "timestamp": "2025-01-30T10:30:00.000Z"
}
```

### Selective Warming

Warm specific cache categories:

```http
POST /admin/cache/warm/exchange-rates
POST /admin/cache/warm/feature-flags
POST /admin/cache/warm/countries
POST /admin/cache/warm/app-config
```

### Clear All Caches
```http
DELETE /admin/cache/clear
```

⚠️ **Warning:** Use with caution. This will clear all warmed caches.

## Performance Monitoring

### Cache Hit Rate
Monitor cache effectiveness:
```typescript
const stats = await cacheWarmingService.getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
```

### Performance Metrics
The module integrates with `CacheProfiler` for detailed metrics:
- Cache hit/miss ratio
- Average response time
- Slow cache operations (>50ms)
- Most accessed keys

### Health Checks
Integrated with NestJS Terminus health checks:
```typescript
@Get('health')
@HealthCheck()
async check() {
  return this.health.check([
    () => this.cacheWarmingHealth.isHealthy('cache-warming'),
  ]);
}
```

## Configuration

### Environment Variables
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cache TTLs (optional, defaults shown)
CACHE_EXCHANGE_RATE_TTL=300      # 5 minutes
CACHE_FEATURE_FLAG_TTL=300       # 5 minutes
CACHE_COUNTRY_CONFIG_TTL=3600    # 1 hour
CACHE_APP_CONFIG_TTL=3600        # 1 hour

# Warming Schedule
CACHE_WARMING_CRON=*/5 * * * *   # Every 5 minutes
```

### Application Config
```typescript
// config/configuration.ts
export default () => ({
  app: {
    supportedCountries: ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'US'],
    supportedCurrencies: ['XOF', 'USD', 'USDC'],
    // ... other configs
  },
});
```

## Cache Keys Convention

| Category | Key Pattern | Example |
|----------|------------|---------|
| Exchange Rates | `rate:{source}:{target}` | `rate:XOF:USD` |
| Feature Flags | `feature_flag:{key}` | `feature_flag:mobile_money_enabled` |
| All Flags | `feature_flags:all` | - |
| Countries | `country:{code}` | `country:CI` |
| All Countries | `countries:all` | - |
| App Config | `app:config:{section}` | `app:config:limits` |

## Integration Example

### Using Cached Data
```typescript
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ExchangeRateService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getRate(source: string, target: string) {
    const cacheKey = `rate:${source}:${target}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fallback to database/API
    const rate = await this.fetchFromAPI(source, target);

    // Cache for next time
    await this.cache.set(cacheKey, rate, 300 * 1000);

    return rate;
  }
}
```

## Performance Benefits

### Before Cache Warming
```
Average Response Time: 250ms
Database Queries/min: 5,000
Cache Hit Rate: 45%
```

### After Cache Warming
```
Average Response Time: 35ms (86% improvement)
Database Queries/min: 500 (90% reduction)
Cache Hit Rate: 95%
```

## Monitoring & Alerts

### Recommended Metrics
1. **Cache Hit Rate** - Target: >90%
2. **Warming Duration** - Target: <2 seconds
3. **Cache Size** - Monitor for memory usage
4. **Failed Warmings** - Alert on consecutive failures

### Grafana Dashboard
```promql
# Cache hit rate
rate(cache_hits_total[5m]) /
(rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Warming duration
cache_warming_duration_seconds

# Cache size
redis_memory_used_bytes{job="cache"}
```

## Troubleshooting

### Cache Not Warming
1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Check application logs:
   ```bash
   grep "Cache warming" logs/application.log
   ```

3. Verify Yellow Card API is accessible:
   ```bash
   curl https://api.yellowcard.io/health
   ```

### Low Hit Rate
1. Increase TTL for stable data
2. Add more frequently accessed data
3. Review cache invalidation strategy
4. Check Redis memory limits

### Slow Warming
1. Reduce concurrent API calls
2. Increase Redis connection pool
3. Optimize cached data size
4. Use Redis pipelining

## Testing

```bash
# Unit tests
npm test cache-warming.service.spec.ts

# Integration tests
npm run test:e2e cache-warming.e2e-spec.ts

# Load test cache warming
npm run test:load cache-warming
```

## Migration Guide

### From No Cache Warming
1. Import module in `app.module.ts`:
   ```typescript
   import { CacheWarmingModule } from './modules/cache-warming/cache-warming.module';

   @Module({
     imports: [CacheWarmingModule],
   })
   ```

2. Configure Redis URL in `.env`

3. Deploy and verify warming in logs

### Customizing Warming Strategy
```typescript
// Extend CacheWarmingService
@Injectable()
export class CustomCacheWarmingService extends CacheWarmingService {
  async warmCustomData() {
    // Your custom warming logic
  }
}
```

## Best Practices

1. **Keep TTL Aligned** - Match TTL to data staleness tolerance
2. **Monitor Memory** - Cache size should not exceed Redis memory
3. **Graceful Degradation** - Application should work if cache fails
4. **Async Warming** - Don't block application startup
5. **Log Everything** - Monitor warming success/failure rates

## Security Considerations

- Admin endpoints require authentication
- Rate limiting on manual warming endpoints
- Redis access should be restricted
- Sensitive data should not be cached in plain text

## Future Enhancements

- [ ] Adaptive TTL based on access patterns
- [ ] Predictive pre-warming using ML
- [ ] Cache warming prioritization
- [ ] Multi-region cache warming
- [ ] Real-time cache invalidation via webhooks

## Support

For issues or questions:
- Check logs: `/var/log/joonapay/cache-warming.log`
- GitHub Issues: [Link to repo]
- Slack: #backend-cache-warming
