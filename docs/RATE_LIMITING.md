# API Rate Limiting

## Overview

Rate limiting protects the JoonaPay API from abuse and ensures fair resource allocation across all users. Our rate limiting system:

- **Prevents brute force attacks** on authentication endpoints
- **Protects against DDoS attacks** by limiting requests per client
- **Ensures system stability** under high load
- **Provides fair access** to all API consumers
- **Reduces costs** by preventing excessive external API calls

### Implementation

We use a **dual-layer rate limiting approach**:

1. **Global Throttling** (`@nestjs/throttler`) - Applied to all endpoints by default
2. **Custom Rate Limiting** (Redis-backed) - Granular control per endpoint with sliding window algorithm

Rate limit state is stored in **Redis** for distributed rate limiting across multiple server instances.

## Rate Limits by Endpoint

### Authentication Endpoints (Strict)

Critical security endpoints with the most restrictive limits to prevent account enumeration and brute force attacks.

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/auth/register` | POST | **5 requests** | 60s | IP Address |
| `/api/v1/auth/verify-otp` | POST | **5 requests** | 60s | IP Address |
| `/api/v1/auth/login` | POST | **5 requests** | 60s | IP Address |
| `/api/v1/auth/refresh` | POST | **10 requests** | 60s | IP Address |
| `/api/v1/auth/logout-all` | POST | **3 requests** | 60s | User ID |

**Why strict limits?**
- Prevents automated account creation
- Blocks OTP brute force attempts (3-6 digit codes)
- Protects against credential stuffing attacks

### Wallet Operations (Moderate)

Financial operations require balance between security and usability.

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/wallet/balance` | GET | **60 requests** | 60s | User ID |
| `/api/v1/wallet/transactions` | GET | **30 requests** | 60s | User ID |
| `/api/v1/wallet/deposit` | POST | **10 requests** | 60s | User ID |

### Transfer Operations (Moderate)

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/transfers` | POST | **10 requests** | 60s | User ID |
| `/api/v1/transfers/:id` | GET | **30 requests** | 60s | User ID |
| `/api/v1/transfers/history` | GET | **30 requests** | 60s | User ID |
| `/api/v1/transfers/:id/cancel` | POST | **5 requests** | 60s | User ID |

### KYC Endpoints (Moderate)

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/kyc/submit` | POST | **3 requests** | 300s | User ID |
| `/api/v1/kyc/status` | GET | **30 requests** | 60s | User ID |
| `/api/v1/kyc/documents/upload` | POST | **10 requests** | 300s | User ID |
| `/api/v1/liveness/start-challenge` | POST | **5 requests** | 300s | User ID |

### Read Operations (Lenient)

Public and low-risk read operations with higher limits.

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/user/profile` | GET | **100 requests** | 60s | User ID |
| `/api/v1/user/username/check/:username` | GET | **30 requests** | 60s | IP Address |
| `/api/v1/user/username/search` | GET | **20 requests** | 60s | User ID |
| `/api/v1/contacts` | GET | **30 requests** | 60s | User ID |
| `/api/v1/beneficiaries` | GET | **30 requests** | 60s | User ID |

### Admin Endpoints (Flexible)

Admin operations with higher limits but still protected.

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/admin/users` | GET | **100 requests** | 60s | User ID |
| `/api/v1/admin/transactions` | GET | **100 requests** | 60s | User ID |
| `/api/v1/admin/reports` | POST | **10 requests** | 60s | User ID |

### Webhook Endpoints (High)

External systems need higher limits for reliable event delivery.

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/v1/webhooks/circle` | POST | **200 requests** | 60s | IP Address |
| `/api/v1/webhooks/twilio` | POST | **200 requests** | 60s | IP Address |
| `/api/v1/webhooks/yellowcard` | POST | **200 requests** | 60s | IP Address |

### Global Default

Any endpoint without a specific rate limit uses the global default:

- **100 requests per 60 seconds** per user (authenticated)
- **30 requests per 60 seconds** per IP (unauthenticated)

## Rate Limit Headers

Every API response includes rate limit information in the headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706553600
```

### Header Descriptions

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in the time window | `100` |
| `X-RateLimit-Remaining` | Number of requests remaining in current window | `87` |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the limit resets | `1706553600` |
| `Retry-After` | Seconds to wait before retrying (only on 429 errors) | `42` |

### Example Response

**Successful Request (200 OK)**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706553600

{
  "userId": "usr_123",
  "balance": "1500.00"
}
```

**Rate Limited Request (429 Too Many Requests)**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706553600
Retry-After: 42

{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 42
}
```

## Error Responses

### 429 Too Many Requests

When you exceed the rate limit, the API returns a `429` status code:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 42
}
```

**Important Fields:**
- `retryAfter`: Number of seconds to wait before retrying
- Always check the `Retry-After` header for the most accurate retry time

### Example Error Handling (TypeScript)

```typescript
async function callApiWithRetry(url: string, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Check rate limit headers
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
      if (remaining < 5) {
        console.warn(`Rate limit warning: only ${remaining} requests remaining`);
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited. Waiting ${retryAfter}s before retry...`);

        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        attempt++;
        continue;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Best Practices for API Consumers

### 1. Implement Exponential Backoff

Don't retry immediately when you hit rate limits. Use exponential backoff:

```typescript
async function exponentialBackoff(
  fn: () => Promise<any>,
  maxRetries = 5
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000); // Max 30s
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const data = await exponentialBackoff(() => fetchUserBalance(userId));
```

### 2. Cache Responses

Reduce API calls by caching responses that don't change frequently:

```typescript
import { Cache } from 'cache-manager';

class ApiClient {
  private cache: Cache;

  async getUserProfile(userId: string) {
    // Check cache first
    const cached = await this.cache.get(`user:${userId}`);
    if (cached) return cached;

    // Fetch from API
    const profile = await this.api.get(`/user/profile`);

    // Cache for 5 minutes
    await this.cache.set(`user:${userId}`, profile, 300);
    return profile;
  }
}
```

### 3. Batch Requests

Instead of making multiple individual requests, batch them when possible:

```typescript
// Bad: Multiple requests
for (const txId of transactionIds) {
  await api.getTransaction(txId); // 100 API calls!
}

// Good: Batch request
const transactions = await api.getTransactions({
  ids: transactionIds // 1 API call
});
```

### 4. Monitor Rate Limit Headers

Track your rate limit usage and adjust behavior proactively:

```typescript
class RateLimitMonitor {
  private usage: Map<string, number> = new Map();

  track(endpoint: string, remaining: number, limit: number) {
    const usage = ((limit - remaining) / limit) * 100;
    this.usage.set(endpoint, usage);

    if (usage > 80) {
      console.warn(`High rate limit usage on ${endpoint}: ${usage.toFixed(1)}%`);
      // Slow down requests or switch to cached data
    }
  }
}

// Usage
const response = await fetch('/api/v1/wallet/balance');
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
const limit = parseInt(response.headers.get('X-RateLimit-Limit'));

monitor.track('/wallet/balance', remaining, limit);
```

### 5. Use Webhooks Instead of Polling

Don't repeatedly poll endpoints for updates. Use webhooks:

```typescript
// Bad: Polling every 5 seconds
setInterval(async () => {
  const status = await api.getTransferStatus(transferId);
  if (status === 'completed') {
    handleCompletion();
  }
}, 5000); // 12 API calls per minute!

// Good: Webhook handler
app.post('/webhooks/transfer', (req, res) => {
  const { transferId, status } = req.body;
  if (status === 'completed') {
    handleCompletion();
  }
  res.sendStatus(200);
});
```

### 6. Handle Rate Limits Gracefully in Mobile Apps

```dart
// Flutter example
class ApiService {
  Future<T> callWithRateLimit<T>(Future<T> Function() apiCall) async {
    try {
      return await apiCall();
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        final retryAfter = e.response?.headers.value('retry-after');
        final seconds = int.tryParse(retryAfter ?? '60') ?? 60;

        // Show user-friendly message
        showSnackBar('Please wait $seconds seconds before trying again');

        // Wait and retry
        await Future.delayed(Duration(seconds: seconds));
        return await apiCall();
      }
      rethrow;
    }
  }
}
```

## Rate Limit Tiers & Exemptions

### Standard Tier (Default)

All users and API keys get standard rate limits by default.

**Limits:**
- Authentication: 5 requests/minute
- Transfers: 10 requests/minute
- Reads: 100 requests/minute

### Business Tier

Available for verified business accounts.

**Limits:**
- Authentication: 20 requests/minute
- Transfers: 50 requests/minute
- Reads: 500 requests/minute

**How to upgrade:**
Contact support@joonapay.com with your:
- Business verification documents
- Use case description
- Expected traffic volume

### Enterprise Tier

Custom rate limits for high-volume integrations.

**Features:**
- Custom rate limits per endpoint
- Dedicated Redis instance
- 99.9% SLA guarantee
- Priority support
- Webhook retry guarantees

**How to apply:**
Contact enterprise@joonapay.com

### API Key-Based Limits

API keys can have custom rate limits configured:

```typescript
// Example: Create API key with custom limits
const apiKey = await admin.apiKeys.create({
  name: 'Partner Integration',
  tier: 'business',
  customLimits: {
    '/api/v1/transfers': { limit: 50, windowSeconds: 60 },
    '/api/v1/wallet/balance': { limit: 200, windowSeconds: 60 }
  }
});
```

### Exemptions

Certain operations are exempt from rate limiting:

- **Health checks**: `/health`, `/metrics`
- **Webhook deliveries**: Inbound webhooks from trusted partners
- **Admin operations**: Internal admin tools (still logged)

## Technical Implementation

### Using Rate Limits in Controllers

Apply custom rate limits to specific endpoints using decorators:

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '@common/rate-limiting';
import { RateLimit, RateLimitPresets } from '@common/rate-limiting';

@Controller('transfers')
@UseGuards(RateLimitGuard)
export class TransferController {

  // Using presets
  @Post()
  @RateLimitPresets.transfer()
  async createTransfer() {
    // 10 requests per minute per user
  }

  // Custom configuration
  @Post('bulk')
  @RateLimit({ limit: 3, windowSeconds: 300 })
  async bulkTransfer() {
    // 3 requests per 5 minutes per user
  }

  // IP-based rate limiting
  @Post('quote')
  @RateLimit({ limit: 20, windowSeconds: 60, byIp: true })
  async getQuote() {
    // 20 requests per minute per IP (for unauthenticated users)
  }
}
```

### Available Presets

```typescript
@RateLimitPresets.auth()      // 5/minute, by IP
@RateLimitPresets.otp()       // 3/5min, by IP (very strict)
@RateLimitPresets.transfer()  // 10/minute, by user
@RateLimitPresets.public()    // 30/minute, by IP
@RateLimitPresets.standard()  // 100/minute, by user
@RateLimitPresets.webhook()   // 200/minute, by IP
@RateLimitPresets.skip()      // No rate limiting
```

### Configuration

Rate limits are configured via environment variables:

```bash
# Global rate limiting (fallback)
RATE_LIMIT_TTL=60              # Time window in seconds
RATE_LIMIT_MAX=100             # Max requests per window

# Redis configuration (required for distributed rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Testing Rate Limits

See [`rate-limit-test.http`](#testing) for manual testing examples.

## Monitoring & Logging

### Rate Limit Violations

All rate limit violations are logged:

```json
{
  "level": "warn",
  "message": "Rate limit exceeded for ip:192.168.1.1:AuthController:login: 5 requests per 60s",
  "timestamp": "2024-01-29T12:00:00.000Z",
  "context": "RateLimitGuard"
}
```

### Metrics

Rate limit metrics are exposed via Prometheus:

```prometheus
# Rate limit checks
rate_limit_checks_total{endpoint="/auth/login",result="allowed"} 1523
rate_limit_checks_total{endpoint="/auth/login",result="blocked"} 42

# Rate limit errors
rate_limit_errors_total{endpoint="/auth/login"} 3
```

### Dashboard

View rate limit analytics in the admin dashboard:

```
/admin/monitoring/rate-limits
```

**Metrics available:**
- Top rate-limited IPs
- Top rate-limited users
- Rate limit hit rate by endpoint
- Average requests per user/IP

## Migration Guide

### Migrating from @nestjs/throttler to Custom Rate Limiting

```typescript
// Old: Using @nestjs/throttler
@Throttle({ default: { ttl: 60000, limit: 5 } })
@Post('login')
async login() {}

// New: Using custom rate limiting
@UseGuards(RateLimitGuard)
@RateLimitPresets.auth()
@Post('login')
async login() {}
```

**Benefits of custom rate limiting:**
- Redis-backed (distributed across servers)
- Sliding window algorithm (smoother rate limiting)
- Per-user and per-IP keys
- Better error messages
- Rate limit headers on every response

## Troubleshooting

### Issue: Rate Limited Despite Low Usage

**Cause:** Multiple devices or sessions using the same account.

**Solution:**
- Check all active sessions: `GET /api/v1/user/sessions`
- Logout from unused devices: `POST /api/v1/auth/logout-all`

### Issue: Rate Limit Headers Not Appearing

**Cause:** Endpoint doesn't use `RateLimitGuard`.

**Solution:** Add the guard to your controller:
```typescript
@UseGuards(RateLimitGuard)
export class YourController {}
```

### Issue: Rate Limits Not Working in Development

**Cause:** Redis not connected.

**Solution:** Check Redis connection:
```bash
redis-cli ping
# Should return: PONG
```

### Issue: Different Rate Limits Between Environments

**Cause:** Environment variables not synced.

**Solution:** Verify `.env` configuration:
```bash
echo $RATE_LIMIT_TTL
echo $RATE_LIMIT_MAX
```

## FAQ

### Q: Are rate limits per user or per IP?

**A:** It depends on the endpoint:
- Authentication endpoints: Per IP (prevents account enumeration)
- Authenticated endpoints: Per user ID
- Public endpoints: Per IP

### Q: Do rate limits apply to admins?

**A:** Yes, but admins typically have higher limits. Enterprise admins can request custom limits.

### Q: What happens if Redis goes down?

**A:** Rate limiting gracefully degrades - requests are allowed but logged. The system remains available.

### Q: Can I request a rate limit increase?

**A:** Yes, contact support@joonapay.com with your use case. Increases are granted based on:
- Account verification status
- Historical API usage
- Business justification

### Q: How do webhooks affect my rate limits?

**A:** Inbound webhooks (from Circle, Twilio, etc.) are exempt from rate limits. Outbound webhook deliveries count against your limits.

### Q: Do failed requests count against rate limits?

**A:** Yes, all requests count, including those that fail validation or return errors. This prevents abuse through intentionally malformed requests.

## Testing

See [`rate-limit-test.http`](/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/rate-limit-test.http) for manual testing examples.

Quick test:

```bash
# Test rate limit on login endpoint (should block after 5 requests)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone": "+2250700000000"}' \
    -i | grep -E "(HTTP|X-RateLimit|Retry-After)"
  echo "Request $i"
  sleep 1
done
```

Expected output:
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
Request 1

HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
Request 2

...

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
Retry-After: 42
Request 6
```

## Support

For rate limiting issues or questions:

- **Email:** support@joonapay.com
- **Slack:** #api-support
- **Documentation:** https://docs.joonapay.com/rate-limiting
- **Status Page:** https://status.joonapay.com

---

**Last Updated:** 2024-01-29
**Version:** 1.0.0
