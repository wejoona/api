# Request Context Service - Index

Complete index and navigation for the Request Context Service.

## Start Here

New to Request Context Service? Start with these files in order:

1. **[SUMMARY.md](./SUMMARY.md)** - 5 min read
   - What it is, why you need it
   - High-level overview
   - Key benefits

2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - 3 min read
   - Setup instructions
   - Common patterns
   - API cheat sheet

3. **[EXAMPLES.md](./EXAMPLES.md)** - 10 min read
   - Real-world usage examples
   - Copy-paste ready code
   - Common scenarios

4. **[INTEGRATION.md](./INTEGRATION.md)** - 15 min read
   - Step-by-step integration
   - Migration guide
   - Troubleshooting

5. **[README.md](./README.md)** - Complete reference
   - Full API documentation
   - All features explained
   - Best practices

6. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive
   - How it works internally
   - Performance characteristics
   - Design decisions

## Documentation Files

### Quick Start
- **[SUMMARY.md](./SUMMARY.md)** - Executive summary
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference card

### Learning
- **[EXAMPLES.md](./EXAMPLES.md)** - Code examples
- **[INTEGRATION.md](./INTEGRATION.md)** - Integration guide
- **[README.md](./README.md)** - Complete documentation

### Deep Dive
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture and internals

### This File
- **[INDEX.md](./INDEX.md)** - Navigation guide (you are here)

## Source Files

### Core Implementation
- **[request-context.service.ts](./request-context.service.ts)** - Main service
- **[request-context.middleware.ts](./request-context.middleware.ts)** - Middleware
- **[request-context.decorator.ts](./request-context.decorator.ts)** - Decorators
- **[request-context.interface.ts](./request-context.interface.ts)** - Type definitions
- **[request-context.module.ts](./request-context.module.ts)** - NestJS module
- **[index.ts](./index.ts)** - Barrel export

### Testing
- **[request-context.service.spec.ts](./request-context.service.spec.ts)** - Unit tests

## Topics

### By Use Case
- **Getting Started** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Real Examples** → [EXAMPLES.md](./EXAMPLES.md)
- **Integration** → [INTEGRATION.md](./INTEGRATION.md)
- **API Reference** → [README.md](./README.md)
- **Architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)

### By Feature
- **User Context** → [README.md#user-information](./README.md)
- **Device Context** → [README.md#device-information](./README.md)
- **Permissions** → [EXAMPLES.md#example-2-permission-based-service](./EXAMPLES.md)
- **Audit Logging** → [EXAMPLES.md#example-4-audit-logging](./EXAMPLES.md)
- **Testing** → [README.md#testing](./README.md)

### By Role

#### Developer (First Time)
1. Read [SUMMARY.md](./SUMMARY.md)
2. Try examples from [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Copy patterns from [EXAMPLES.md](./EXAMPLES.md)

#### Developer (Integration)
1. Follow [INTEGRATION.md](./INTEGRATION.md) step-by-step
2. Reference [README.md](./README.md) for API details
3. Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) as cheat sheet

#### Architect
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Check [SUMMARY.md](./SUMMARY.md) for benefits
3. Review tests in [request-context.service.spec.ts](./request-context.service.spec.ts)

#### DevOps
1. Understand observability in [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Check performance in [SUMMARY.md](./SUMMARY.md)
3. Review integration in [INTEGRATION.md](./INTEGRATION.md)

## Common Questions

### How do I get started?
→ Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

### How do I integrate this?
→ Follow [INTEGRATION.md](./INTEGRATION.md)

### What are real-world examples?
→ See [EXAMPLES.md](./EXAMPLES.md)

### What's the full API?
→ Read [README.md](./README.md)

### How does it work internally?
→ Check [ARCHITECTURE.md](./ARCHITECTURE.md)

### How do I test with context?
→ See [README.md#testing](./README.md) and [request-context.service.spec.ts](./request-context.service.spec.ts)

### What's the performance impact?
→ See [ARCHITECTURE.md#performance-characteristics](./ARCHITECTURE.md)

### How do I troubleshoot?
→ Check [INTEGRATION.md#troubleshooting](./INTEGRATION.md)

## Code Examples Index

### Basic Usage
```typescript
// Get user ID
const userId = this.requestContext.getUserId();

// Get correlation ID
const correlationId = this.requestContext.getCorrelationId();

// Get IP address
const ip = this.requestContext.getIp();
```
→ More in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

### Advanced Usage
- Transaction Service → [EXAMPLES.md#example-1](./EXAMPLES.md)
- Permission Checks → [EXAMPLES.md#example-2](./EXAMPLES.md)
- Deep Call Stack → [EXAMPLES.md#example-3](./EXAMPLES.md)
- Audit Logging → [EXAMPLES.md#example-4](./EXAMPLES.md)
- Rate Limiting → [EXAMPLES.md#example-5](./EXAMPLES.md)
- Fraud Detection → [EXAMPLES.md#example-7](./EXAMPLES.md)

### Integration Patterns
- Auth Guard → [INTEGRATION.md#step-3](./INTEGRATION.md)
- Logging → [INTEGRATION.md#step-5](./INTEGRATION.md)
- Audit → [INTEGRATION.md#step-7](./INTEGRATION.md)
- Testing → [INTEGRATION.md#step-9](./INTEGRATION.md)

## API Reference Index

### Context Management
- `getContext()` → [README.md](./README.md)
- `updateContext()` → [README.md](./README.md)
- `setCustom()` → [README.md](./README.md)
- `getCustom()` → [README.md](./README.md)

### Request Info
- `getCorrelationId()` → [README.md](./README.md)
- `getRequestId()` → [README.md](./README.md)
- `getTimestamp()` → [README.md](./README.md)
- `getMethod()` → [README.md](./README.md)
- `getPath()` → [README.md](./README.md)

### User Info
- `getUserId()` → [README.md](./README.md)
- `getUserEmail()` → [README.md](./README.md)
- `getUserRole()` → [README.md](./README.md)
- `isAuthenticated()` → [README.md](./README.md)
- `hasPermission()` → [README.md](./README.md)

### Device Info
- `getDeviceId()` → [README.md](./README.md)
- `isDeviceTrusted()` → [README.md](./README.md)
- `isDeviceRooted()` → [README.md](./README.md)

### Metadata
- `getIp()` → [README.md](./README.md)
- `getUserAgent()` → [README.md](./README.md)
- `getCountry()` → [README.md](./README.md)

### Utilities
- `getLogContext()` → [README.md](./README.md)
- `getAuditContext()` → [README.md](./README.md)

## Decorators

- `@CurrentUser()` → [README.md#decorators](./README.md)
- `@CorrelationId()` → [README.md#decorators](./README.md)
- `@ClientIp()` → [README.md#decorators](./README.md)
- `@Device()` → [README.md#decorators](./README.md)
- `@ReqContext()` → [README.md#decorators](./README.md)

## File Statistics

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| request-context.service.ts | Code | 383 | Main service |
| request-context.middleware.ts | Code | 143 | Initialize context |
| request-context.decorator.ts | Code | 119 | Controller decorators |
| request-context.interface.ts | Code | 98 | Type definitions |
| request-context.module.ts | Code | 32 | NestJS module |
| request-context.service.spec.ts | Tests | 573 | Unit tests |
| SUMMARY.md | Docs | ~200 | Overview |
| EXAMPLES.md | Docs | 677 | Code examples |
| README.md | Docs | 583 | Complete docs |
| INTEGRATION.md | Docs | 451 | Integration guide |
| QUICK_REFERENCE.md | Docs | 267 | Quick reference |
| ARCHITECTURE.md | Docs | 444 | Architecture |

**Total**: 3,775 lines

## Search by Keyword

### Keywords → Documents

- **AsyncLocalStorage** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Authentication** → [INTEGRATION.md](./INTEGRATION.md), [EXAMPLES.md](./EXAMPLES.md)
- **Audit** → [EXAMPLES.md#example-4](./EXAMPLES.md), [README.md](./README.md)
- **Correlation ID** → All documents
- **Device** → [README.md](./README.md), [EXAMPLES.md](./EXAMPLES.md)
- **Fraud** → [EXAMPLES.md#example-7](./EXAMPLES.md)
- **Integration** → [INTEGRATION.md](./INTEGRATION.md)
- **Logging** → [README.md](./README.md), [EXAMPLES.md#example-6](./EXAMPLES.md)
- **Permissions** → [EXAMPLES.md#example-2](./EXAMPLES.md), [README.md](./README.md)
- **Performance** → [ARCHITECTURE.md](./ARCHITECTURE.md), [SUMMARY.md](./SUMMARY.md)
- **Security** → [ARCHITECTURE.md](./ARCHITECTURE.md), [INTEGRATION.md](./INTEGRATION.md)
- **Testing** → [README.md#testing](./README.md), [request-context.service.spec.ts](./request-context.service.spec.ts)

## Related Documentation

### In This Repository
- [Logging Interceptor](../../interceptors/logging.interceptor.ts)
- [Security Headers Middleware](../../middleware/security-headers.middleware.ts)
- [Auth Guards](../../guards/)

### External Resources
- [Node.js AsyncLocalStorage](https://nodejs.org/api/async_context.html)
- [NestJS Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS Middleware](https://docs.nestjs.com/middleware)

## Contributing

To add or update documentation:

1. Follow existing format
2. Update INDEX.md (this file)
3. Update SUMMARY.md if adding new features
4. Add examples to EXAMPLES.md
5. Update QUICK_REFERENCE.md for common patterns

## Version

- **Current Version**: 1.0.0
- **Created**: 2026-01-30
- **Last Updated**: 2026-01-30

## Quick Links

- [Get Started](./QUICK_REFERENCE.md)
- [See Examples](./EXAMPLES.md)
- [Integrate](./INTEGRATION.md)
- [API Reference](./README.md)
- [Architecture](./ARCHITECTURE.md)
- [Tests](./request-context.service.spec.ts)
- [Source Code](./request-context.service.ts)

---

**Navigation**: You are in INDEX.md - Use links above to navigate to specific topics.
