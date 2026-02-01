# Request Context Service - Integration Guide

Step-by-step guide to integrate RequestContextService into your NestJS application.

## Step 1: Install Dependencies

The service uses Node.js built-in `async_hooks`, so no additional dependencies needed.

Ensure you have:
- Node.js >= 12.17.0 (for AsyncLocalStorage support)
- uuid (already in project)

## Step 2: Import Module

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import {
  RequestContextModule,
  RequestContextMiddleware,
} from '@/common/services/request-context';

@Module({
  imports: [
    RequestContextModule, // Add this
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware globally
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

## Step 3: Update Auth Guards (Optional but Recommended)

Update your authentication guards to populate user info in context:

```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);

    if (isValid) {
      const request = context.switchToHttp().getRequest();

      // Populate user in request context
      this.requestContext.updateContext({
        user: {
          id: request.user.id,
          sub: request.user.sub,
          email: request.user.email,
          role: request.user.role,
          permissions: request.user.permissions,
          deviceId: request.user.deviceId,
          sessionId: request.user.sessionId,
        },
      });
    }

    return isValid as boolean;
  }
}
```

## Step 4: Update Device Middleware (Optional)

If you have device fingerprinting:

```typescript
// src/common/middleware/device.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class DeviceMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract device info from headers
    const deviceId = req.headers['x-device-id'] as string;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
    const platform = req.headers['x-platform'] as string;
    const appVersion = req.headers['x-app-version'] as string;

    if (deviceId) {
      // Update context with device info
      this.requestContext.updateContext({
        device: {
          id: deviceId,
          fingerprint: deviceFingerprint,
          platform,
          appVersion,
          // Device trust would be determined by a separate service
        },
      });
    }

    next();
  }
}
```

## Step 5: Update Logging Interceptor

Enhance your logging interceptor to use request context:

```typescript
// src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Use context for structured logging
        this.logger.log('Request completed', {
          ...this.requestContext.getLogContext(),
          duration,
        });
      }),
    );
  }
}
```

## Step 6: Update Existing Services

Gradually update services to use request context:

### Before:
```typescript
@Injectable()
export class TransactionService {
  async createTransaction(userId: string, dto: CreateTransactionDto) {
    // Had to pass userId everywhere
  }
}

// Controller had to extract and pass
@Controller('transactions')
export class TransactionController {
  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(user.id, dto);
  }
}
```

### After:
```typescript
@Injectable()
export class TransactionService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async createTransaction(dto: CreateTransactionDto) {
    // Get userId from context
    const userId = this.requestContext.getUserId();
    const correlationId = this.requestContext.getCorrelationId();
    const ip = this.requestContext.getIp();

    // Use context data
  }
}

// Controller simplified
@Controller('transactions')
export class TransactionController {
  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(dto);
  }
}
```

## Step 7: Update Audit Logging

```typescript
// Before
await this.auditService.log({
  action: 'USER_CREATED',
  userId: request.user.id,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  // ... manually collect all context
});

// After
await this.auditService.log({
  action: 'USER_CREATED',
  ...this.requestContext.getAuditContext(),
});
```

## Step 8: GeoIP Integration (Optional)

If you have GeoIP middleware:

```typescript
// src/common/middleware/geoip.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';
import geoip from 'geoip-lite';

@Injectable()
export class GeoIpMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.requestContext.getIp();
    const geo = geoip.lookup(ip);

    if (geo) {
      this.requestContext.updateContext({
        metadata: {
          ...this.requestContext.getContext()?.metadata,
          country: geo.country,
          region: geo.region,
        },
      });
    }

    next();
  }
}
```

## Step 9: Testing Setup

Update your test setup:

```typescript
// test/helpers/request-context.helper.ts
import { RequestContext } from '@/common/services/request-context';

export function createMockContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    correlationId: 'test-correlation-id',
    requestId: 'test-request-id',
    timestamp: new Date(),
    method: 'GET',
    path: '/test',
    url: '/test',
    metadata: {
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...overrides,
  };
}

// Usage in tests
describe('TransactionService', () => {
  it('should create transaction', async () => {
    const context = createMockContext({
      user: { id: 'user-123', role: 'user' },
    });

    await requestContext.run(context, async () => {
      const result = await service.createTransaction(dto);
      expect(result.userId).toBe('user-123');
    });
  });
});
```

## Step 10: Verify Integration

Create a test endpoint to verify everything works:

```typescript
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Controller('health')
export class HealthController {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('context')
  getContext() {
    return {
      hasContext: this.requestContext.hasContext(),
      correlationId: this.requestContext.getCorrelationId(),
      isAuthenticated: this.requestContext.isAuthenticated(),
      userId: this.requestContext.getUserId(),
      ip: this.requestContext.getIp(),
      path: this.requestContext.getPath(),
      logContext: this.requestContext.getLogContext(),
    };
  }
}
```

Test with:
```bash
curl http://localhost:3000/health/context
```

## Migration Checklist

- [ ] Import RequestContextModule in AppModule
- [ ] Apply RequestContextMiddleware globally
- [ ] Update auth guards to populate user context
- [ ] Update device middleware (if applicable)
- [ ] Update logging interceptor
- [ ] Update audit service
- [ ] Update services to use context instead of passing parameters
- [ ] Add GeoIP middleware (optional)
- [ ] Update test helpers
- [ ] Verify with test endpoint
- [ ] Update documentation

## Common Issues

### Issue 1: Context Not Available
**Problem**: `getContextOrThrow()` throws error

**Solution**: Ensure middleware is applied before the code trying to access context:
```typescript
// In AppModule
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(RequestContextMiddleware)
    .forRoutes('*'); // Apply to all routes
}
```

### Issue 2: User Not in Context
**Problem**: `getUserId()` returns undefined even when authenticated

**Solution**: Update auth guard to populate context:
```typescript
this.requestContext.updateContext({
  user: request.user,
});
```

### Issue 3: Context Leaking in Tests
**Problem**: Context from one test affects another

**Solution**: Ensure each test runs in its own context:
```typescript
await requestContext.run(mockContext, async () => {
  // Test code here
});
```

### Issue 4: Context Lost in Background Jobs
**Problem**: Context not available in queued jobs

**Solution**: Pass correlation ID explicitly to jobs:
```typescript
// In service
const correlationId = this.requestContext.getCorrelationId();
await this.queue.add({ data, correlationId });

// In job processor
@Process('job-name')
async process(job: Job) {
  // Create new context for job
  const context = createJobContext(job.data.correlationId);
  await this.requestContext.run(context, async () => {
    // Process job
  });
}
```

## Performance Impact

- **Overhead**: < 1ms per request
- **Memory**: ~1KB per request (automatically cleaned up)
- **CPU**: Negligible (AsyncLocalStorage is optimized in V8)

## Security Considerations

1. **PII in Logs**: Be careful logging user emails in production
   ```typescript
   // In production, avoid logging sensitive data
   const isDev = process.env.NODE_ENV === 'development';
   const logContext = {
     ...this.requestContext.getLogContext(),
     email: isDev ? this.requestContext.getUserEmail() : undefined,
   };
   ```

2. **Context Validation**: Don't trust context data without validation
   ```typescript
   const userId = this.requestContext.getUserId();
   if (!userId) {
     throw new UnauthorizedException();
   }
   ```

3. **Audit Trails**: Always use context for security events
   ```typescript
   await this.auditLog.create({
     event: 'SENSITIVE_ACTION',
     ...this.requestContext.getAuditContext(),
   });
   ```

## Next Steps

1. Start with read-only usage (logging, audit)
2. Gradually replace parameter passing
3. Update guards and middleware
4. Add device validation
5. Implement fraud detection using context

## Support

For issues or questions:
- Check README.md for API reference
- Check EXAMPLES.md for usage patterns
- Review tests for edge cases
