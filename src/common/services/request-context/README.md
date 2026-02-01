# Request Context Service

Provides access to request-scoped context throughout the application using Node.js AsyncLocalStorage.

## Features

- Access current user, device, IP, correlation ID from anywhere in the request lifecycle
- Thread-safe (async-safe) context isolation between concurrent requests
- No need to pass request objects through the entire call stack
- Automatic cleanup after request completes
- Type-safe context access with TypeScript

## Installation

### 1. Import the Module

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import {
  RequestContextModule,
  RequestContextMiddleware
} from '@/common/services/request-context';

@Module({
  imports: [
    RequestContextModule, // Import the module
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware globally to all routes
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes('*');
  }
}
```

### 2. Usage in Services

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class TransactionService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async createTransaction(data: CreateTransactionDto) {
    // Access user ID without passing it as parameter
    const userId = this.requestContext.getUserId();
    const correlationId = this.requestContext.getCorrelationId();
    const ip = this.requestContext.getIp();

    this.logger.log('Creating transaction', {
      userId,
      correlationId,
      ip,
    });

    // Your logic here
  }
}
```

### 3. Usage in Controllers (Alternative)

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CorrelationId, ClientIp } from '@/common/services/request-context';

@Controller('profile')
export class ProfileController {
  // Using decorators
  @Get()
  async getProfile(
    @CurrentUser() user: RequestUser,
    @CorrelationId() correlationId: string,
    @ClientIp() ip: string,
  ) {
    return {
      userId: user.id,
      correlationId,
      ip,
    };
  }
}
```

## API Reference

### RequestContextService

#### Context Accessors

```typescript
// Get full context
getContext(): RequestContext | undefined
getContextOrThrow(): RequestContext

// Update context (useful after authentication)
updateContext(partial: PartialRequestContext): void

// Custom data
setCustom(key: string, value: unknown): void
getCustom<T>(key: string): T | undefined
```

#### Request Information

```typescript
getCorrelationId(): string        // Always available
getRequestId(): string             // Same as correlation ID
getTimestamp(): Date | undefined
getMethod(): string | undefined    // GET, POST, etc.
getPath(): string | undefined      // /api/v1/users
getUrl(): string | undefined       // Full URL
getRequestDuration(): number       // Milliseconds since request start
```

#### User Information

```typescript
getUser(): RequestUser | undefined
getUserId(): string | undefined
getUserEmail(): string | undefined
getUserRole(): string | undefined
getUserPermissions(): readonly string[]
isAuthenticated(): boolean
hasRole(role: string): boolean
hasPermission(permission: string): boolean
hasAnyPermission(permissions: string[]): boolean
hasAllPermissions(permissions: string[]): boolean
```

#### Device Information

```typescript
getDevice(): RequestDevice | undefined
getDeviceId(): string | undefined
getDeviceFingerprint(): string | undefined
getSessionId(): string | undefined
isDeviceTrusted(): boolean
isDeviceRooted(): boolean
```

#### Request Metadata

```typescript
getIp(): string                              // Client IP (proxy-aware)
getUserAgent(): string
getOrigin(): string | undefined
getReferer(): string | undefined
getAcceptLanguage(): string | undefined
getCountry(): string | undefined            // From GeoIP
getRegion(): string | undefined             // From GeoIP
```

#### Utility Methods

```typescript
hasContext(): boolean                       // Check if in request scope
getLogContext(): Record<string, unknown>    // For structured logging
getAuditContext(): Record<string, unknown>  // For audit logs
```

## Decorators

### @CurrentUser()

Extracts the authenticated user from request context.

```typescript
@Get('profile')
async getProfile(@CurrentUser() user: RequestUser) {
  return this.userService.findById(user.id);
}
```

### @CorrelationId()

Extracts the correlation ID.

```typescript
@Post('transfer')
async transfer(
  @CorrelationId() correlationId: string,
  @Body() dto: TransferDto,
) {
  this.logger.log(`Transfer request ${correlationId}`);
  return this.transferService.create(dto);
}
```

### @ClientIp()

Extracts the client IP address (proxy-aware).

```typescript
@Post('login')
async login(@ClientIp() ip: string, @Body() dto: LoginDto) {
  this.auditService.logLogin(dto.email, ip);
  return this.authService.login(dto);
}
```

### @Device()

Extracts device information.

```typescript
@Post('register-device')
async registerDevice(@Device() device: RequestDevice) {
  return this.deviceService.register(device);
}
```

### @ReqContext()

Extracts the full request context.

```typescript
@Get('debug')
async debug(@ReqContext() context: RequestContext) {
  return {
    correlationId: context.correlationId,
    userId: context.user?.id,
    ip: context.metadata.ip,
  };
}
```

## Common Patterns

### Audit Logging

```typescript
@Injectable()
export class AuditService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async logAction(action: string, details: any) {
    const auditLog = {
      action,
      details,
      ...this.requestContext.getAuditContext(),
    };

    await this.auditRepository.create(auditLog);
  }
}
```

### Structured Logging

```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async processPayment(data: PaymentDto) {
    const logContext = this.requestContext.getLogContext();

    this.logger.log('Processing payment', {
      ...logContext,
      amount: data.amount,
      currency: data.currency,
    });

    // Process payment
  }
}
```

### Permission Checks

```typescript
@Injectable()
export class AdminService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async performAdminAction() {
    if (!this.requestContext.hasRole('admin')) {
      throw new ForbiddenException('Admin role required');
    }

    if (!this.requestContext.hasPermission('users:delete')) {
      throw new ForbiddenException('Delete permission required');
    }

    // Perform action
  }
}
```

### Populating Context After Authentication

```typescript
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

      // Update context with user info after JWT validation
      this.requestContext.updateContext({
        user: {
          id: request.user.id,
          email: request.user.email,
          role: request.user.role,
          permissions: request.user.permissions,
          deviceId: request.user.deviceId,
          sessionId: request.user.sessionId,
        },
      });
    }

    return isValid;
  }
}
```

### Device Validation

```typescript
@Injectable()
export class DeviceService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async validateDevice() {
    if (this.requestContext.isDeviceRooted()) {
      throw new ForbiddenException('Rooted devices not allowed');
    }

    if (!this.requestContext.isDeviceTrusted()) {
      // Require additional verification
      await this.requireAdditionalAuth();
    }
  }
}
```

### Deep in the Call Stack

```typescript
// No need to pass request/user through multiple layers
@Injectable()
export class DeepNestedService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async someDeepMethod() {
    // Still have access to request context
    const userId = this.requestContext.getUserId();
    const correlationId = this.requestContext.getCorrelationId();

    this.logger.log('Deep method called', {
      userId,
      correlationId,
    });
  }
}
```

## Context Lifecycle

```
Request arrives
    ↓
RequestContextMiddleware initializes context
    ↓
Context stored in AsyncLocalStorage
    ↓
Request flows through guards, interceptors, controllers, services
    ↓
All can access context via RequestContextService
    ↓
Guards update context with user info
    ↓
Services use context for logging, audit, authorization
    ↓
Response sent
    ↓
Context automatically cleaned up
```

## Best Practices

### 1. Always Check for Context in Optional Scenarios

```typescript
// Good
const userId = this.requestContext.getUserId();
if (userId) {
  // Use userId
}

// Or use getContextOrThrow() when context is required
const context = this.requestContext.getContextOrThrow();
```

### 2. Use Structured Logging

```typescript
// Good
this.logger.log('Action performed', {
  ...this.requestContext.getLogContext(),
  additionalData: value,
});

// Avoid
this.logger.log(`Action by user ${userId}`);
```

### 3. Use Audit Context for Security Events

```typescript
await this.auditLog.create({
  event: 'SENSITIVE_ACTION',
  ...this.requestContext.getAuditContext(),
  metadata: { /* action-specific data */ },
});
```

### 4. Update Context in Guards

```typescript
// Auth guards should update context with user info
@Injectable()
export class AuthGuard {
  async canActivate(context: ExecutionContext) {
    // Validate user
    const user = await this.validateUser();

    // Update request context
    this.requestContext.updateContext({ user });

    return true;
  }
}
```

### 5. Use Custom Data for Request-Specific State

```typescript
// Store request-specific data
this.requestContext.setCustom('processingStartTime', Date.now());

// Retrieve later in another service
const startTime = this.requestContext.getCustom<number>('processingStartTime');
```

## Performance Considerations

- AsyncLocalStorage has minimal overhead (< 1ms per request)
- Context is automatically garbage collected after request
- No memory leaks as context is scoped to request lifecycle
- Safe for concurrent requests (each has isolated context)

## Security Considerations

- User info only available after authentication guard runs
- Device trust status can be used for conditional access
- IP address useful for rate limiting and fraud detection
- Correlation ID helps with security incident investigation

## Troubleshooting

### "Request context not found" Error

This means the middleware hasn't run. Ensure:
1. RequestContextModule is imported in AppModule
2. RequestContextMiddleware is applied globally
3. Middleware runs before the code trying to access context

### Context Not Updated After Authentication

Ensure your auth guard calls `updateContext()`:

```typescript
this.requestContext.updateContext({ user: validatedUser });
```

### Context Leaking Between Requests

This should never happen if using AsyncLocalStorage correctly. If it does:
1. Ensure you're not storing context in class properties
2. Check that middleware is applied correctly
3. Verify Node.js version supports AsyncLocalStorage (v12.17.0+)

## Testing

### Unit Tests

```typescript
describe('SomeService', () => {
  let service: SomeService;
  let requestContext: RequestContextService;

  beforeEach(() => {
    const module = await Test.createTestingModule({
      providers: [
        SomeService,
        RequestContextService,
      ],
    }).compile();

    service = module.get(SomeService);
    requestContext = module.get(RequestContextService);
  });

  it('should use request context', async () => {
    const mockContext: RequestContext = {
      correlationId: 'test-id',
      requestId: 'test-id',
      timestamp: new Date(),
      method: 'GET',
      path: '/test',
      url: '/test',
      user: { id: 'user-123' },
      metadata: { ip: '127.0.0.1', userAgent: 'test' },
    };

    await requestContext.run(mockContext, async () => {
      const userId = requestContext.getUserId();
      expect(userId).toBe('user-123');
    });
  });
});
```

### E2E Tests

```typescript
describe('API Endpoints', () => {
  it('should include correlation ID in response', () => {
    return request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-correlation-id']).toBeDefined();
      });
  });
});
```

## Type Definitions

See `request-context.interface.ts` for full type definitions:

- `RequestContext` - Full context shape
- `RequestUser` - User information
- `RequestDevice` - Device information
- `RequestMetadata` - Request metadata
- `PartialRequestContext` - For updates

## Related

- [Logging Interceptor](../../interceptors/logging.interceptor.ts) - Uses request context for structured logging
- [Security Headers Middleware](../../middleware/security-headers.middleware.ts) - Sets correlation ID headers
- [Auth Guards](../../guards/) - Update context with user info
