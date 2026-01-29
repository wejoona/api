# HTTP Interceptors

Global HTTP interceptors for the JoonaPay USDC Wallet backend.

## Available Interceptors

### 1. LoggingInterceptor
Comprehensive request/response logging with sensitive data sanitization.

**Features:**
- Structured JSON logging
- Correlation ID tracking
- Automatic sensitive data sanitization
- Environment-based log levels
- Performance monitoring
- User tracking

**Docs:** [LOGGING.md](./LOGGING.md)
**Examples:** [LOGGING_EXAMPLES.md](./LOGGING_EXAMPLES.md)
**Tests:** [logging.interceptor.spec.ts](./logging.interceptor.spec.ts)

---

### 2. MetricsInterceptor
Performance metrics collection for monitoring.

**Features:**
- Request duration tracking
- Endpoint performance metrics
- Status code distribution
- Integration with MetricsService

---

### 3. IdempotencyInterceptor
Prevents duplicate request execution using idempotency keys.

**Features:**
- Deduplication of POST/PUT/PATCH requests
- Redis-backed idempotency key storage
- Configurable TTL (24 hours default)
- Returns cached response for duplicate requests

**Usage:**
```typescript
@Post('transfer')
@UseInterceptors(IdempotencyInterceptor)
async transfer(@Body() dto: TransferDto) {
  // This method won't execute twice for same idempotency key
}
```

Client includes header:
```bash
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

---

### 4. VersionHeaderInterceptor
Adds API version information to response headers.

**Features:**
- Adds `X-API-Version` header to all responses
- Helps clients track API version compatibility
- Useful for debugging and monitoring

**Response Headers:**
```
X-API-Version: 1.0.0
```

---

## Global Registration

All interceptors are registered globally in `src/main.ts`:

```typescript
import {
  LoggingInterceptor,
  MetricsInterceptor,
  VersionHeaderInterceptor,
} from './common/interceptors';

app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new MetricsInterceptor(metricsService),
  new VersionHeaderInterceptor(),
);
```

## Interceptor Order

Interceptors execute in the order they are registered:

1. **LoggingInterceptor** - Logs request entry and attaches correlation ID
2. **MetricsInterceptor** - Starts performance timing
3. **VersionHeaderInterceptor** - Adds version header
4. **Controller Logic** - Your endpoint executes
5. **VersionHeaderInterceptor** - (response phase)
6. **MetricsInterceptor** - Records metrics
7. **LoggingInterceptor** - Logs response/error

## Creating Custom Interceptors

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CustomInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Pre-processing
    console.log('Before request...');

    return next.handle().pipe(
      tap(() => {
        // Post-processing
        console.log('After request...');
      }),
    );
  }
}
```

### Register Globally
```typescript
// In main.ts
app.useGlobalInterceptors(new CustomInterceptor());
```

### Register Per-Controller
```typescript
@Controller('wallet')
@UseInterceptors(CustomInterceptor)
export class WalletController {}
```

### Register Per-Route
```typescript
@Get('balance')
@UseInterceptors(CustomInterceptor)
async getBalance() {}
```

## Testing Interceptors

Run all interceptor tests:
```bash
npm run test -- interceptors
```

Run specific interceptor test:
```bash
npm run test -- logging.interceptor.spec.ts
```

## Environment Configuration

### Development
```env
NODE_ENV=development
```
- Verbose logging (full request/response details)
- Stack traces included in error logs
- Debug-level logs shown

### Production
```env
NODE_ENV=production
```
- Minimal logging (field names only, no values)
- No stack traces in logs
- Debug-level logs hidden (unless explicitly enabled)

## Troubleshooting

### Interceptor Not Executing
1. Check if registered in `main.ts`
2. Verify guard/filter order (guards run before interceptors)
3. Check if route excludes interceptors

### Logs Not Appearing
1. Verify `NODE_ENV` setting
2. Check NestJS logger configuration
3. Ensure log level allows output

### Performance Impact
- Each interceptor adds ~1-2ms overhead
- Logging interceptor: ~1-2ms
- Metrics interceptor: ~0.5ms
- Version header: <0.1ms

Total overhead: ~2-3ms per request

## Related Documentation

- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)

## Files

```
src/common/interceptors/
├── README.md                           # This file
├── LOGGING.md                          # Logging interceptor documentation
├── LOGGING_EXAMPLES.md                 # Example log outputs
├── logging.interceptor.ts              # Request/response logging
├── logging.interceptor.spec.ts         # Logging tests
├── metrics.interceptor.ts              # Performance metrics
├── idempotency.interceptor.ts          # Request deduplication
├── version-header.interceptor.ts       # Version header injection
└── index.ts                            # Barrel export
```
