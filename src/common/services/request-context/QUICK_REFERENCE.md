# Request Context Service - Quick Reference

## Setup (One-Time)

```typescript
// app.module.ts
import { RequestContextModule, RequestContextMiddleware } from '@/common/services/request-context';

@Module({
  imports: [RequestContextModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

## Usage in Services

```typescript
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class YourService {
  constructor(private readonly requestContext: RequestContextService) {}

  async yourMethod() {
    // Get user info
    const userId = this.requestContext.getUserId();
    const email = this.requestContext.getUserEmail();
    const role = this.requestContext.getUserRole();

    // Get request info
    const correlationId = this.requestContext.getCorrelationId();
    const ip = this.requestContext.getIp();
    const path = this.requestContext.getPath();

    // Get device info
    const deviceId = this.requestContext.getDeviceId();
    const isRooted = this.requestContext.isDeviceRooted();
    const isTrusted = this.requestContext.isDeviceTrusted();

    // Check permissions
    if (!this.requestContext.hasPermission('users:delete')) {
      throw new ForbiddenException();
    }

    // Get contexts for logging/audit
    const logContext = this.requestContext.getLogContext();
    const auditContext = this.requestContext.getAuditContext();
  }
}
```

## Usage with Decorators

```typescript
import { CurrentUser, CorrelationId, ClientIp, Device } from '@/common/services/request-context';

@Controller('users')
export class UserController {
  @Get('profile')
  async getProfile(@CurrentUser() user: RequestUser) {
    return { id: user.id, email: user.email };
  }

  @Post('action')
  async performAction(
    @CorrelationId() correlationId: string,
    @ClientIp() ip: string,
  ) {
    this.logger.log(`Action from ${ip}`, { correlationId });
  }
}
```

## Common Patterns

### Structured Logging
```typescript
this.logger.log('Action performed', {
  ...this.requestContext.getLogContext(),
  customData: value,
});
```

### Audit Logging
```typescript
await this.auditService.log({
  action: 'USER_UPDATED',
  ...this.requestContext.getAuditContext(),
});
```

### Permission Checks
```typescript
if (!this.requestContext.hasRole('admin')) {
  throw new ForbiddenException();
}

if (!this.requestContext.hasAllPermissions(['read', 'write'])) {
  throw new ForbiddenException();
}
```

### Device Validation
```typescript
if (this.requestContext.isDeviceRooted()) {
  throw new ForbiddenException('Rooted devices not allowed');
}

if (!this.requestContext.isDeviceTrusted()) {
  // Require additional auth
}
```

## API Quick Reference

### Request Info
- `getCorrelationId()` - Unique request ID
- `getRequestId()` - Same as correlation ID
- `getTimestamp()` - Request start time
- `getMethod()` - HTTP method
- `getPath()` - Request path
- `getUrl()` - Full URL
- `getRequestDuration()` - Time since request start

### User Info
- `getUserId()` - User ID
- `getUserEmail()` - User email
- `getUserRole()` - User role
- `getUserPermissions()` - Array of permissions
- `isAuthenticated()` - Check if user is logged in
- `hasRole(role)` - Check specific role
- `hasPermission(perm)` - Check specific permission
- `hasAnyPermission([...])` - Check any permission
- `hasAllPermissions([...])` - Check all permissions

### Device Info
- `getDeviceId()` - Device ID
- `getDeviceFingerprint()` - Device fingerprint
- `getDevice()` - Full device object
- `isDeviceTrusted()` - Check if device is trusted
- `isDeviceRooted()` - Check if device is rooted/jailbroken

### Metadata
- `getIp()` - Client IP (proxy-aware)
- `getUserAgent()` - User agent string
- `getOrigin()` - Origin header
- `getReferer()` - Referer header
- `getAcceptLanguage()` - Accept-Language header
- `getCountry()` - Country from GeoIP
- `getRegion()` - Region from GeoIP

### Context Management
- `getContext()` - Full context object
- `updateContext(partial)` - Update context
- `setCustom(key, value)` - Set custom data
- `getCustom(key)` - Get custom data
- `hasContext()` - Check if in request scope

### Utility
- `getLogContext()` - For structured logging
- `getAuditContext()` - For audit logs

## Testing

```typescript
import { RequestContextService } from '@/common/services/request-context';
import { createMockContext } from '@/test/helpers/request-context.helper';

describe('YourService', () => {
  let service: YourService;
  let requestContext: RequestContextService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [YourService, RequestContextService],
    }).compile();

    service = module.get(YourService);
    requestContext = module.get(RequestContextService);
  });

  it('should work with context', async () => {
    const context = {
      correlationId: 'test-123',
      requestId: 'test-123',
      timestamp: new Date(),
      method: 'GET',
      path: '/test',
      url: '/test',
      user: { id: 'user-123' },
      metadata: { ip: '127.0.0.1', userAgent: 'test' },
    };

    await requestContext.run(context, async () => {
      const result = await service.yourMethod();
      expect(result.userId).toBe('user-123');
    });
  });
});
```

## Update Auth Guard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly requestContext: RequestContextService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);

    if (isValid) {
      const request = context.switchToHttp().getRequest();
      this.requestContext.updateContext({
        user: {
          id: request.user.id,
          email: request.user.email,
          role: request.user.role,
          permissions: request.user.permissions,
        },
      });
    }

    return isValid as boolean;
  }
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Context not found" error | Ensure middleware is applied globally |
| User info not available | Update auth guard to populate context |
| Context leaking in tests | Use `run()` to create isolated contexts |
| Context lost in async | AsyncLocalStorage maintains context automatically |

## Best Practices

1. Use `getLogContext()` for consistent structured logging
2. Use `getAuditContext()` for security/compliance events
3. Check `isAuthenticated()` before accessing user data
4. Use decorators in controllers, service injection in business logic
5. Don't pass userId/ip through function parameters - use context
6. Update context in guards, not in services
7. Store request-specific data in custom context

## Performance

- Overhead: < 1ms per request
- Memory: ~1KB per request
- Auto cleanup: Yes
- Thread safe: Yes (async-safe)

## Security Notes

- Don't log sensitive user data in production
- Validate context data before using
- Use context for audit trails
- Check device trust for sensitive operations
- Use correlation ID for incident investigation
