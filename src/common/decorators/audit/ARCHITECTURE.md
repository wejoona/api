# Audit Logging Architecture

Technical architecture and design decisions for the audit logging system.

## Overview

The audit logging system uses NestJS interceptors and decorators to automatically capture method calls with full context for compliance tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controller Layer                         │
│  @AuditTransfer() @AuditKyc() @AuditAuth() etc.                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AuditLogInterceptor                          │
│  - Intercepts method execution                                   │
│  - Extracts metadata from decorator                             │
│  - Captures request context (user, IP, user-agent)              │
│  - Redacts sensitive data                                        │
│  - Measures execution duration                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AuditService                             │
│  - Validates and enriches audit data                            │
│  - Persists to database (async)                                 │
│  - Provides query interface                                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database (PostgreSQL)                      │
│  audit_logs table with indexes                                  │
│  - actor_id, action, resource_type, resource_id                 │
│  - created_at for time-series queries                           │
│  - JSONB details for flexible metadata                          │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Decorators

#### @AuditLog (Core)
```typescript
@AuditLog({
  action: string,              // Required: 'transfer.create'
  resourceType: string,        // Required: 'transfer'
  resourceIdPath?: string,     // Optional: 'result.id'
  includeArgs?: boolean | [],  // Optional: false
  includeResult?: boolean,     // Optional: false
  detailsExtractor?: Function, // Optional: custom extractor
  logOnError?: boolean,        // Optional: true
  sensitiveFields?: string[],  // Optional: see defaults
  highRisk?: boolean,          // Optional: false
})
```

**Metadata Storage:** Uses `SetMetadata` to attach options to method handler

**Reflection:** AuditLogInterceptor uses `Reflector` to read metadata

#### Predefined Decorators
- `@AuditCreate(resourceType, options?)`
- `@AuditUpdate(resourceType, options?)`
- `@AuditDelete(resourceType, options?)`
- `@AuditRead(resourceType, options?)`
- `@AuditTransfer(options?)`
- `@AuditWithdrawal(options?)`
- `@AuditDeposit(options?)`
- `@AuditKyc(action, options?)`
- `@AuditAuth(action, options?)`
- `@AuditAdmin(action, resourceType, options?)`
- `@AuditConfig(action, options?)`
- `@AuditWebhook(action, options?)`

**Design Pattern:** Facade pattern to simplify common use cases

### 2. Interceptor

#### AuditLogInterceptor

**Responsibilities:**
1. Method interception using RxJS operators
2. Metadata extraction from decorator
3. Request context capture
4. Resource ID extraction
5. Sensitive data redaction
6. Performance measurement
7. Async audit logging

**Execution Flow:**

```typescript
intercept(context, next) {
  1. Read decorator metadata
  2. If no metadata, pass through
  3. Capture start time
  4. Execute method (next.handle())
  5. On success:
     - Extract resource ID
     - Build details object
     - Redact sensitive data
     - Log to AuditService
  6. On error (if logOnError):
     - Include error details
     - Log to AuditService
     - Re-throw error
  7. Return result/error
}
```

**Non-blocking:** Audit logging is async and doesn't block requests

**Error Handling:** Failed audit logs are logged but don't fail requests

### 3. Service Layer

#### AuditService

**Methods:**
- `log(data)` - Create audit log entry
- `query(params)` - Query with filters
- `getResourceHistory(type, id)` - Resource timeline
- `getActorHistory(actorId)` - User activity
- `getRecentLogs(limit)` - Recent activity
- `cleanupOldLogs(days)` - Retention policy

**Database:** Uses TypeORM repository pattern

**Indexing Strategy:**
- `actor_id` - User activity queries
- `action` - Action-based filtering
- `resource_type` - Resource-based filtering
- `resource_id` - Specific resource history
- `created_at` - Time-series queries

### 4. Data Model

```typescript
interface AuditLog {
  id: string;                           // UUID
  actorId: string | null;               // User/admin who performed action
  actorType: 'user' | 'admin' | 'system';
  action: string;                       // 'transfer.create'
  resourceType: string;                 // 'transfer'
  resourceId: string | null;            // Specific resource ID
  details: Record<string, unknown>;     // JSONB with flexible data
  ipAddress: string | null;             // Client IP
  userAgent: string | null;             // Client user agent
  createdAt: Date;                      // Timestamp
}
```

**Details Structure:**
```json
{
  "method": "POST",
  "url": "/api/v1/transfers",
  "duration": 234,
  "success": true,
  "args": [...],           // If includeArgs
  "result": {...},         // If includeResult
  "error": {...},          // On error
  "custom": {...}          // From detailsExtractor
}
```

## Design Decisions

### 1. Decorator-Based API

**Why:**
- Declarative and easy to use
- Consistent with NestJS patterns
- Minimal code changes required
- Self-documenting

**Alternative considered:** Manual service calls
- More verbose
- Easy to forget
- Inconsistent usage

### 2. Interceptor Pattern

**Why:**
- Automatic execution
- Access to full request context
- Can intercept both success and error
- Non-blocking

**Alternative considered:** Middleware
- Less access to method metadata
- Can't intercept method result
- More difficult to configure per-endpoint

### 3. Async Logging

**Why:**
- Doesn't block request processing
- Better performance
- Failures don't affect business operations

**Trade-off:** Potential log loss on crash (acceptable for audit logs)

### 4. Sensitive Data Redaction

**Default sensitive fields:**
```typescript
[
  'password', 'pin', 'secret', 'token',
  'apiKey', 'apiSecret', 'privateKey',
  'accessToken', 'refreshToken', 'authToken',
]
```

**Strategy:** Recursive object traversal with case-insensitive matching

**Why:** Prevent accidental logging of credentials

### 5. Resource ID Extraction

**Path notation:** Dot-separated path like 'result.data.id'

**Supported sources:**
- Method arguments: 'args.0.id'
- Method result: 'result.id'
- Nested properties: 'result.data.transfer.id'

**Why:** Flexible enough for different method signatures

### 6. Custom Details Extractor

**Function signature:**
```typescript
detailsExtractor: (
  args: any[],
  result: any,
  context: { user: User, request: Request }
) => Record<string, unknown>
```

**Why:** Allow domain-specific enrichment without modifying interceptor

### 7. Actor Type Detection

**Logic:**
```typescript
actorType = user?.role === 'admin' ? 'admin' : 'user'
```

**Types:** user, admin, system

**Why:** Different compliance requirements for different actor types

### 8. High-Risk Flagging

**Usage:** Mark sensitive operations (deletions, approvals, etc.)

**Purpose:** Enable different retention policies or alerting

**Implementation:** Stored in `details.highRisk` field

## Performance Considerations

### 1. Database Indexes

All frequently queried fields are indexed:
- `actor_id` - User activity queries
- `action` - Action filtering
- `resource_type` - Resource filtering
- `resource_id` - Specific resource
- `created_at` - Time-series

### 2. Async Processing

Audit logging doesn't block:
- Uses RxJS `tap` operator
- Runs after response sent
- Errors logged but not thrown

### 3. Pagination

Query results are paginated:
- Default: 50 records
- Maximum: 1000 records
- Offset-based pagination

### 4. Retention Policy

Old logs are cleaned up:
- Default: 90 days
- Configurable via environment
- Scheduled job (daily at 2 AM)

### 5. JSONB Storage

`details` field uses JSONB:
- Indexed queries on JSON properties
- Efficient storage
- Flexible schema

## Security Considerations

### 1. Data Sanitization

Sensitive fields automatically redacted:
- Recursive object traversal
- Case-insensitive matching
- Configurable per decorator

### 2. IP Address Capture

Multiple sources checked:
1. `request.ip`
2. `x-forwarded-for` header
3. `connection.remoteAddress`
4. `socket.remoteAddress`

### 3. Actor Validation

Actor ID from authenticated user:
- `request.user.id` or `request.user.sub`
- Set by JwtAuthGuard
- Null if unauthenticated

### 4. SQL Injection Prevention

TypeORM parameterized queries:
- All user input parameterized
- No string concatenation
- LIKE patterns escaped

### 5. Access Control

Audit log access restricted:
- Admin users only
- Role-based guards
- Sensitive fields redacted even in queries

## Compliance Features

### 1. Immutability

Audit logs are write-only:
- No update operations
- No delete (except retention cleanup)
- Separate table from business data

### 2. Completeness

Captures full context:
- Who (actor)
- What (action)
- When (timestamp)
- Where (resource)
- How (details)
- From where (IP, user agent)

### 3. Non-Repudiation

Cryptographic integrity:
- UUIDs prevent ID prediction
- Timestamps from database
- IP and user agent captured

### 4. Retention

Configurable retention policy:
- Default 90 days (configurable)
- Scheduled cleanup
- Compliance with GDPR/data laws

### 5. Auditability

Query capabilities:
- By actor (user activity)
- By resource (resource timeline)
- By action (action-based filtering)
- By date range (compliance reports)

## Testing Strategy

### 1. Unit Tests

Test interceptor behavior:
- Metadata extraction
- Resource ID extraction
- Sensitive data redaction
- Error handling

### 2. Integration Tests

Test with real AuditService:
- Database persistence
- Query functionality
- Retention cleanup

### 3. E2E Tests

Test full flow:
- Request with decorator
- Audit log creation
- Query audit logs

### 4. Performance Tests

Measure overhead:
- Request latency impact
- Database query performance
- Large dataset queries

## Extension Points

### 1. Custom Decorators

Create domain-specific decorators:
```typescript
export const AuditRecurringTransfer = (options?) =>
  AuditLog({
    action: 'recurring_transfer.create',
    resourceType: 'recurring_transfer',
    // ...
    ...options,
  });
```

### 2. Custom Details Extractors

Add domain logic:
```typescript
detailsExtractor: (args, result, context) => ({
  transferType: determineTransferType(args[0]),
  riskScore: calculateRiskScore(result),
  complianceFlags: checkCompliance(context.user),
})
```

### 3. External Integrations

Send logs to external systems:
```typescript
// After AuditService.log()
await this.eventBus.publish(
  new AuditLogCreatedEvent(auditLog)
);

// In handler
async handleAuditLogCreated(event) {
  await this.splunkService.send(event.data);
  await this.slackService.notifyHighRisk(event.data);
}
```

### 4. Real-time Monitoring

Stream audit logs:
```typescript
@Get('audit/stream')
async streamAuditLogs(@Req() req: Request) {
  return this.auditService.createStream({
    highRisk: true,
    actions: ['transfer.create', 'withdrawal.create'],
  });
}
```

## Migration Guide

### From Manual Logging

**Before:**
```typescript
async createTransfer(dto: CreateTransferDto, userId: string) {
  const transfer = await this.service.create(dto, userId);

  await this.auditService.log({
    actorId: userId,
    action: 'transfer.create',
    resourceType: 'transfer',
    resourceId: transfer.id,
    details: { amount: dto.amount },
  });

  return transfer;
}
```

**After:**
```typescript
@Post()
@AuditTransfer()
async createTransfer(
  @Body() dto: CreateTransferDto,
  @CurrentUser() user: User
) {
  return this.service.create(dto, user.id);
}
```

### From Other Logging Systems

1. Map action names to new format
2. Update queries to use AuditService
3. Migrate existing logs (optional)
4. Update compliance reports

## Monitoring and Alerting

### Metrics to Track

1. **Volume:** Audit logs created per hour/day
2. **Actions:** Top actions by frequency
3. **Errors:** Failed audit log writes
4. **High-risk:** High-risk actions per day
5. **Performance:** Audit logging overhead

### Alerts

1. **Unusual volume:** Spike in audit logs
2. **High-risk actions:** Multiple high-risk actions
3. **Failed logging:** Audit service errors
4. **Suspicious patterns:** Unusual actor behavior

## Future Enhancements

1. **Event Sourcing:** Use audit logs as event store
2. **Replay:** Replay actions from audit logs
3. **Diff Tracking:** Track changes to resources
4. **Blockchain:** Immutable audit trail on blockchain
5. **ML Detection:** Anomaly detection on audit logs
6. **Compliance Reports:** Pre-built regulatory reports
7. **Real-time Streaming:** Stream to analytics platform
8. **Advanced Search:** Full-text search on details
