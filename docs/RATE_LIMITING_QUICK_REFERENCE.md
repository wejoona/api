# Rate Limiting Quick Reference

## Quick Start

### 1. Apply Rate Limit to Controller

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimitGuard, RateLimitPresets } from '@common/rate-limiting';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {

  @Post('login')
  @RateLimitPresets.auth() // 5 requests/minute per IP
  async login() {}

  @Post('verify-otp')
  @RateLimitPresets.otp() // 3 requests/5min per IP
  async verifyOtp() {}
}
```

### 2. Custom Rate Limits

```typescript
import { RateLimit } from '@common/rate-limiting';

@Post('bulk-transfer')
@RateLimit({ limit: 5, windowSeconds: 300 }) // 5 requests per 5 minutes
async bulkTransfer() {}
```

### 3. Check Rate Limit Headers (Client)

```typescript
const response = await fetch('/api/v1/wallet/balance');

console.log(response.headers.get('X-RateLimit-Limit'));      // "100"
console.log(response.headers.get('X-RateLimit-Remaining'));  // "87"
console.log(response.headers.get('X-RateLimit-Reset'));      // "1706553600"
```

## Presets

| Preset | Limit | Window | Key | Use Case |
|--------|-------|--------|-----|----------|
| `.auth()` | 5 | 60s | IP | Login, register, OTP |
| `.otp()` | 3 | 300s | IP | OTP verification (strict) |
| `.transfer()` | 10 | 60s | User | Financial operations |
| `.public()` | 30 | 60s | IP | Public/unauthenticated |
| `.standard()` | 100 | 60s | User | Default authenticated |
| `.webhook()` | 200 | 60s | IP | External webhooks |
| `.admin()` | 200 | 60s | User | Admin operations |
| `.enterprise()` | 500 | 60s | User | API key overrides |
| `.skip()` | - | - | - | Disable rate limiting |

## Common Patterns

### Pattern 1: Strict Auth Endpoints

```typescript
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  @Post('login')
  @RateLimitPresets.auth() // IP-based, strict
  async login() {}
}
```

### Pattern 2: Per-User Financial Operations

```typescript
@Controller('transfers')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class TransferController {
  @Post()
  @RateLimitPresets.transfer() // User-based, moderate
  async createTransfer() {}
}
```

### Pattern 3: High-Volume Webhooks

```typescript
@Controller('webhooks')
export class WebhookController {
  @Post('circle')
  @UseGuards(RateLimitGuard)
  @RateLimitPresets.webhook() // IP-based, high limit
  async handleCircleWebhook() {}
}
```

### Pattern 4: API Key with Custom Limits

```typescript
@Controller('api')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class ApiController {
  @Get('data')
  @RateLimitPresets.enterprise() // Allows API key override
  async getData() {}
}
```

### Pattern 5: Admin Bypass

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  @Get('reports')
  @RateLimitPresets.admin() // Bypassed for admin/superadmin roles
  async getReports() {}
}
```

## Configuration Options

```typescript
interface RateLimitConfig {
  limit: number;                    // Max requests in window
  windowSeconds: number;            // Time window in seconds
  byIp?: boolean;                   // Use IP instead of user ID
  keyPrefix?: string;               // Custom Redis key prefix
  skip?: boolean;                   // Disable rate limiting
  allowApiKeyOverride?: boolean;    // Allow API keys to override
  bypassRoles?: string[];           // Roles that bypass limits
}
```

## Error Response (429)

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 42
}
```

## Client-Side Retry Logic

```typescript
async function callApiWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

## Testing

### Manual Test (curl)

```bash
# Test rate limit
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone": "+2250700000000"}' \
    -i | grep -E "(HTTP|X-RateLimit)"
  sleep 1
done
```

### VS Code REST Client

See [`rate-limit-test.http`](/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/rate-limit-test.http)

## Admin Operations

### Set Custom API Key Limit

```typescript
import { RateLimitService } from '@common/rate-limiting';

// In your admin controller/service
await rateLimitService.setCustomLimitForApiKey(
  'apk_123',
  '/api/v1/transfers', // or '*' for all endpoints
  { limit: 1000, windowSeconds: 60 }
);
```

### Remove Custom Limit

```typescript
await rateLimitService.removeCustomLimitForApiKey(
  'apk_123',
  '/api/v1/transfers'
);
```

### Reset Rate Limit for User

```typescript
await rateLimitService.reset('user:usr_123:TransferController:createTransfer');
```

## Monitoring

### Check Redis Keys

```bash
# View all rate limit keys
redis-cli KEYS "rate_limit:*"

# View specific user's rate limit
redis-cli GET "rate_limit:user:usr_123:TransferController:createTransfer"

# View API key custom limits
redis-cli KEYS "api_key_limits:*"
```

### Prometheus Metrics

```prometheus
# Rate limit checks
rate_limit_checks_total{endpoint="/auth/login",result="allowed"}
rate_limit_checks_total{endpoint="/auth/login",result="blocked"}

# Violations
rate_limit_violations_total{endpoint="/auth/login"}
```

## Environment Variables

```bash
# Global rate limiting (fallback)
RATE_LIMIT_TTL=60              # Time window in seconds
RATE_LIMIT_MAX=100             # Max requests per window

# Redis (required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Common Issues

### Issue: Rate limited despite low usage

**Fix:** Multiple sessions/devices using same account
```bash
# Check active sessions
GET /api/v1/user/sessions

# Logout from all devices
POST /api/v1/auth/logout-all
```

### Issue: Headers not showing

**Fix:** Add RateLimitGuard to controller
```typescript
@UseGuards(RateLimitGuard)
export class MyController {}
```

### Issue: Redis connection error

**Fix:** Check Redis is running
```bash
redis-cli ping  # Should return PONG
```

## Best Practices

1. **Use IP-based limits for auth endpoints** (prevents account enumeration)
2. **Use user-based limits for authenticated endpoints** (fair per-user quota)
3. **Set appropriate limits** (balance security vs usability)
4. **Monitor rate limit violations** (detect abuse patterns)
5. **Provide clear error messages** (include retryAfter in responses)
6. **Cache responses** (reduce API calls on client side)
7. **Use webhooks** (avoid polling endpoints repeatedly)

## See Also

- [Full Rate Limiting Documentation](/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/docs/RATE_LIMITING.md)
- [Test File](/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/rate-limit-test.http)
- [NestJS Throttler Docs](https://docs.nestjs.com/security/rate-limiting)

---

**Quick Links:**
- Support: support@joonapay.com
- Docs: https://docs.joonapay.com/rate-limiting
- Status: https://status.joonapay.com
