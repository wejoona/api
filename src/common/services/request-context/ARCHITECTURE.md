# Request Context Service - Architecture

## Overview

Request Context Service provides request-scoped data access throughout the application using Node.js AsyncLocalStorage API.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          HTTP Request                            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RequestContextMiddleware                       │
│  - Extracts correlation ID, IP, user agent                      │
│  - Creates initial context                                      │
│  - Stores in AsyncLocalStorage                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Authentication Guards                       │
│  - Validates JWT/session                                        │
│  - Updates context with user info                               │
│  - Updates context with device info                             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Interceptors                             │
│  - Logging interceptor uses context                             │
│  - Performance interceptor uses context                         │
│  - Response transformation uses context                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Controllers                             │
│  - Access via decorators (@CurrentUser, @CorrelationId)         │
│  - Or inject RequestContextService                              │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Services                               │
│  - Inject RequestContextService                                 │
│  - Access user, device, IP anywhere                             │
│  - No need to pass through parameters                           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Repositories/DAL                            │
│  - Can access context if needed                                 │
│  - Use for audit fields (createdBy, etc.)                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Response Interceptors                       │
│  - Add correlation ID to response headers                       │
│  - Log response with context                                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       HTTP Response                              │
│  Headers: X-Correlation-ID, X-Request-ID                        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Request
  │
  ├─► Middleware creates context
  │   └─► Stores in AsyncLocalStorage
  │
  ├─► Guards update context
  │   └─► Adds user info
  │   └─► Adds device info
  │
  ├─► Controller accesses context
  │   └─► Via decorators or service
  │
  ├─► Service Layer 1 accesses context
  │   └─► Gets user ID, correlation ID
  │   │
  │   ├─► Service Layer 2 accesses same context
  │   │   └─► Gets IP, device info
  │   │   │
  │   │   ├─► Service Layer 3 accesses same context
  │   │   │   └─► Gets permissions, metadata
  │   │   │   │
  │   │   │   └─► Repository accesses context
  │   │   │       └─► Audit fields populated
  │   │   │
  │   │   └─► Returns to Layer 2
  │   │
  │   └─► Returns to Layer 1
  │
  └─► Response interceptors use context
      └─► Add headers, log with correlation ID
```

## Component Breakdown

### RequestContextService
```typescript
@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }
}
```

**Responsibilities:**
- Manage AsyncLocalStorage
- Provide context accessors
- Provide convenience getters
- Provide context updates

**Scope:** DEFAULT (singleton across application)

### RequestContextMiddleware
```typescript
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const context = this.buildInitialContext(req);
    this.requestContextService.run(context, () => next());
  }
}
```

**Responsibilities:**
- Extract request metadata
- Create initial context
- Start AsyncLocalStorage scope

**Order:** First middleware (before auth, before guards)

### RequestContext Interface
```typescript
interface RequestContext {
  correlationId: string;
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  url: string;
  user?: RequestUser;
  device?: RequestDevice;
  metadata: RequestMetadata;
  custom?: Record<string, unknown>;
}
```

**Fields:**
- `correlationId` - Unique request identifier
- `user` - Authenticated user (populated by guards)
- `device` - Device info (populated by guards/middleware)
- `metadata` - IP, user agent, GeoIP
- `custom` - Extensible key-value store

## AsyncLocalStorage Internals

```
┌───────────────────────────────────────────────────┐
│             AsyncLocalStorage API                  │
│  (Built into Node.js async_hooks)                 │
└───────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────┐
│           Async Execution Context                  │
│  - Each async operation has own context           │
│  - Context propagates through async calls         │
│  - Automatic cleanup when scope ends              │
└───────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────┐
│              Request Isolation                     │
│  Request 1: Context A ────┐                       │
│  Request 2: Context B ────┼─► Isolated            │
│  Request 3: Context C ────┘                       │
└───────────────────────────────────────────────────┘
```

### How AsyncLocalStorage Works

1. **Storage Creation**: Single instance per service
2. **Context Start**: `run(context, callback)` creates new async context
3. **Context Propagation**: Automatically propagates through:
   - Promise chains
   - async/await
   - setTimeout/setInterval
   - Event emitters
   - Database queries
   - HTTP calls
4. **Context Retrieval**: `getStore()` returns current context
5. **Context Cleanup**: Automatic when callback completes

### Thread Safety

```
Concurrent Requests:

Request A                Request B                Request C
   │                        │                        │
   ├─ Context A             ├─ Context B             ├─ Context C
   │                        │                        │
   ├─ Service Layer         ├─ Service Layer         ├─ Service Layer
   │  Gets Context A        │  Gets Context B        │  Gets Context C
   │                        │                        │
   ├─ DB Query (async)      ├─ DB Query (async)      ├─ DB Query (async)
   │  Still Context A       │  Still Context B       │  Still Context C
   │                        │                        │
   └─ Response              └─ Response              └─ Response
      Context A cleaned        Context B cleaned        Context C cleaned
```

## Performance Characteristics

### Memory Usage
- **Per Request**: ~1KB for context object
- **Overhead**: AsyncLocalStorage internal structures (~500 bytes)
- **Total**: ~1.5KB per concurrent request
- **Cleanup**: Automatic garbage collection when request ends

### CPU Overhead
- **Context Creation**: ~0.1ms
- **Context Access**: ~0.001ms (essentially free)
- **Total**: < 1ms per request

### Scalability
- **Concurrent Requests**: No limit (each isolated)
- **Memory Leak Risk**: None (automatic cleanup)
- **Performance Degradation**: None at scale

## Comparison with Alternatives

### 1. Parameter Passing
```typescript
// Without Context
async method1(userId: string, ip: string, correlationId: string) {
  await method2(userId, ip, correlationId);
}

async method2(userId: string, ip: string, correlationId: string) {
  await method3(userId, ip, correlationId);
}

// With Context
async method1() {
  const userId = this.requestContext.getUserId();
  await method2();
}

async method2() {
  await method3();
}
```

**Benefits:**
- Less boilerplate
- Cleaner interfaces
- Easy to add new context fields

### 2. Request Object Passing
```typescript
// Without Context
async method(req: Request) {
  const userId = req.user.id;
  await anotherMethod(req);
}

// With Context
async method() {
  const userId = this.requestContext.getUserId();
  await anotherMethod();
}
```

**Benefits:**
- No HTTP dependency in business logic
- Easier to test
- Clearer separation of concerns

### 3. Continuation-Local Storage (cls-hooked)
**AsyncLocalStorage vs CLS:**
- AsyncLocalStorage: Native Node.js, better performance
- CLS: Third-party, more overhead, deprecated

## Integration Points

### Authentication Guard
```typescript
@Injectable()
export class JwtAuthGuard {
  async canActivate(context: ExecutionContext) {
    const user = await this.validateToken();
    this.requestContext.updateContext({ user });
    return true;
  }
}
```

### Logging Interceptor
```typescript
@Injectable()
export class LoggingInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(() => {
        this.logger.log('Request', this.requestContext.getLogContext());
      }),
    );
  }
}
```

### Audit Service
```typescript
@Injectable()
export class AuditService {
  async log(action: string) {
    await this.auditRepo.create({
      action,
      ...this.requestContext.getAuditContext(),
    });
  }
}
```

### Repository Layer
```typescript
@Injectable()
export class UserRepository {
  async create(data: CreateUserDto) {
    return this.repo.save({
      ...data,
      createdBy: this.requestContext.getUserId(),
      createdIp: this.requestContext.getIp(),
    });
  }
}
```

## Security Considerations

### PII Protection
- User email only logged in development
- Sensitive fields redacted from context
- Audit context includes minimal PII

### Access Control
- Context updated only by trusted code (middleware, guards)
- Services read-only (cannot fake user context)
- Custom context isolated per request

### Audit Trail
- Correlation ID in all logs
- Full audit context for security events
- IP and device info for fraud detection

## Testing Strategy

### Unit Tests
```typescript
await requestContext.run(mockContext, async () => {
  // Test code has access to context
});
```

### Integration Tests
```typescript
await request(app)
  .get('/endpoint')
  .expect(200)
  .expect((res) => {
    expect(res.headers['x-correlation-id']).toBeDefined();
  });
```

### E2E Tests
```typescript
// Context automatically available in real requests
// Verify headers, audit logs, etc.
```

## Migration Path

1. **Phase 1**: Install (logging only)
   - Add module, middleware
   - Use in logging interceptor
   - No code changes

2. **Phase 2**: Auth Integration
   - Update guards to populate context
   - Use in audit logging
   - Minimal service changes

3. **Phase 3**: Gradual Adoption
   - Replace parameter passing
   - Simplify service interfaces
   - Update controllers

4. **Phase 4**: Full Integration
   - All services use context
   - Remove redundant parameters
   - Optimize for context

## Future Enhancements

- [ ] Distributed tracing integration (OpenTelemetry)
- [ ] Context propagation to message queues
- [ ] Context serialization for async jobs
- [ ] Context replay for debugging
- [ ] Request context snapshots for audit

## Related Patterns

- **Ambient Context Pattern**: Context available without passing
- **Continuation-Local Storage**: Async-safe storage
- **Thread-Local Storage**: Thread-specific data (similar concept)
- **Dependency Injection**: But for request-scoped data

## References

- [Node.js AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
- [Async Hooks Documentation](https://nodejs.org/api/async_hooks.html)
- [NestJS Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
