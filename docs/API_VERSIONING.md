# API Versioning Strategy

## Overview

JoonaPay USDC Wallet API uses URI-based versioning to maintain backward compatibility while allowing for API evolution. This document outlines the versioning strategy, implementation details, and best practices.

## Versioning Type

**URI-based versioning** (`/api/v1/*`, `/api/v2/*`)

### Why URI Versioning?

- **Clear and explicit**: Version is visible in the URL
- **Easy to understand**: Developers immediately see which version they're using
- **Simple to implement**: No custom headers or content negotiation required
- **Cache-friendly**: Different versions have different URLs
- **Documentation-friendly**: Easy to document and test

## Version Format

```
https://api.joonapay.com/api/v{version}/{resource}
```

### Examples

```
GET /api/v1/wallet
GET /api/v1/auth/register
POST /api/v2/wallet/transfer
```

## Current Versions

| Version | Status | Release Date | Deprecation Date | Sunset Date |
|---------|--------|--------------|------------------|-------------|
| v1      | Current | 2026-01-01   | -                | -           |
| v2      | Planned | TBD          | -                | -           |

## Implementation

### 1. Main Configuration (main.ts)

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1', // All endpoints default to v1
});
```

### 2. Controller Versioning

#### Default Version (v1)

Controllers without explicit version decorator default to v1:

```typescript
@Controller('wallet')  // Available at /api/v1/wallet
export class WalletController {
  @Get()
  getBalance() { }
}
```

#### Explicit Versioning

Specify version using the `@Version()` decorator:

```typescript
import { Controller, Get, Version } from '@nestjs/common';

@Controller('wallet')
export class WalletController {
  // v1 endpoint
  @Get()
  @Version('1')
  getBalanceV1() { }

  // v2 endpoint with new response format
  @Get()
  @Version('2')
  getBalanceV2() { }
}
```

#### Multiple Versions

Support multiple versions for the same endpoint:

```typescript
@Get()
@Version(['1', '2'])  // Available in both v1 and v2
getBalance() { }
```

#### Neutral Version

Endpoints available across all versions (use sparingly):

```typescript
import { VERSION_NEUTRAL } from '@nestjs/common';

@Get('health')
@Version(VERSION_NEUTRAL)  // Available at /api/health (no version)
healthCheck() { }
```

### 3. Version Headers

The `VersionHeaderInterceptor` automatically adds headers to all responses:

```http
X-API-Version: 1
X-API-Latest-Version: 1
```

When an endpoint is deprecated:

```http
X-API-Version: 1
X-API-Latest-Version: 2
X-API-Deprecated: true
X-API-Deprecation-Info: API version 1 is deprecated. Please migrate to v2.
```

## Versioning Best Practices

### When to Create a New Version

Create a new API version when making **breaking changes**:

- **Breaking Changes** (require new version):
  - Removing endpoints or fields
  - Renaming fields
  - Changing field types
  - Changing response structure
  - Changing authentication mechanism
  - Changing error response format

- **Non-Breaking Changes** (can be in same version):
  - Adding new optional fields
  - Adding new endpoints
  - Adding new optional query parameters
  - Adding new error codes (while maintaining existing ones)
  - Performance improvements
  - Bug fixes

### Version Lifecycle

1. **Current**: The latest stable version, fully supported
2. **Deprecated**: Still functional but scheduled for removal, clients should migrate
3. **Sunset**: No longer available, returns 410 Gone

### Deprecation Timeline

- Deprecation notice: 6 months before sunset
- Sunset date: At least 12 months after deprecation announcement

Example timeline:
```
v1 Release:     2026-01-01
v2 Release:     2026-07-01 (v1 marked deprecated)
v1 Sunset:      2027-07-01 (minimum 12 months)
```

## Migration Guide

### For API Consumers

1. **Check response headers** for deprecation warnings:
   ```typescript
   const response = await fetch('/api/v1/wallet');
   const deprecated = response.headers.get('X-API-Deprecated');
   const latestVersion = response.headers.get('X-API-Latest-Version');
   ```

2. **Update base URL** when ready to migrate:
   ```typescript
   // Before
   const BASE_URL = 'https://api.joonapay.com/api/v1';

   // After
   const BASE_URL = 'https://api.joonapay.com/api/v2';
   ```

3. **Test thoroughly** with new version before switching production traffic

### For API Developers

#### Creating a New Version

1. **Copy existing controller** to new file (optional, for major changes):
   ```bash
   cp wallet.controller.ts wallet.v2.controller.ts
   ```

2. **Add version decorator**:
   ```typescript
   @Controller('wallet')
   export class WalletV2Controller {
     @Get()
     @Version('2')
     getBalance() {
       // New implementation
     }
   }
   ```

3. **Update module** to include both versions:
   ```typescript
   @Module({
     controllers: [
       WalletController,      // v1
       WalletV2Controller,    // v2
     ],
   })
   export class WalletModule {}
   ```

4. **Update Swagger documentation**:
   ```typescript
   const config = new DocumentBuilder()
     .setTitle('USDC Wallet API')
     .setVersion('2.0')  // Update version
     .build();
   ```

#### Deprecating a Version

1. **Add to deprecated list** in `version-header.interceptor.ts`:
   ```typescript
   private readonly DEPRECATED_VERSIONS: string[] = ['1'];
   ```

2. **Update documentation** with migration guide

3. **Announce deprecation** to API consumers (email, changelog, etc.)

4. **Monitor usage** of deprecated version

5. **Sunset old version** after timeline:
   ```typescript
   @Get()
   @Version('1')
   @HttpCode(410)  // Gone
   async getBalanceV1() {
     throw new GoneException('API v1 has been sunset. Please use v2.');
   }
   ```

## Swagger Documentation

Each version can have separate Swagger documentation:

```typescript
// v1 Documentation
const v1Config = new DocumentBuilder()
  .setTitle('USDC Wallet API v1')
  .setVersion('1.0')
  .build();
const v1Document = SwaggerModule.createDocument(app, v1Config);
SwaggerModule.setup('docs/v1', app, v1Document);

// v2 Documentation
const v2Config = new DocumentBuilder()
  .setTitle('USDC Wallet API v2')
  .setVersion('2.0')
  .build();
const v2Document = SwaggerModule.createDocument(app, v2Config);
SwaggerModule.setup('docs/v2', app, v2Document);
```

## Testing Versioned APIs

### Unit Tests

```typescript
describe('WalletController v1', () => {
  it('should return balance in v1 format', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .expect(200);

    expect(response.body).toHaveProperty('balance');
    expect(response.headers['x-api-version']).toBe('1');
  });
});

describe('WalletController v2', () => {
  it('should return balance in v2 format', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/wallet')
      .expect(200);

    expect(response.body).toHaveProperty('balances'); // New format
    expect(response.headers['x-api-version']).toBe('2');
  });
});
```

## Monitoring

Track version usage in metrics:

```typescript
// In MetricsInterceptor
const version = this.extractVersionFromPath(request.path);
this.metricsService.incrementCounter('api_requests_by_version', {
  version,
  endpoint: request.path,
});
```

Dashboard metrics to track:
- Requests per version
- Error rates per version
- Response times per version
- Active clients per version

## Example: Real-World Version Migration

### Scenario: Changing Balance Response Format

**v1 Response:**
```json
{
  "walletId": "123",
  "balance": 100.50,
  "currency": "USD"
}
```

**v2 Response (breaking change):**
```json
{
  "walletId": "123",
  "balances": [
    {
      "currency": "USD",
      "available": 100.50,
      "pending": 0,
      "total": 100.50
    }
  ]
}
```

**Implementation:**

```typescript
@Controller('wallet')
export class WalletController {
  // v1 - Legacy format
  @Get()
  @Version('1')
  async getBalanceV1(@Request() req: AuthenticatedRequest) {
    const balance = await this.getBalanceUseCase.execute({
      userId: req.user.id
    });

    // Return legacy format
    return {
      walletId: balance.walletId,
      balance: balance.balances[0].available,
      currency: balance.balances[0].currency,
    };
  }

  // v2 - New format
  @Get()
  @Version('2')
  async getBalanceV2(@Request() req: AuthenticatedRequest) {
    // Return new format directly
    return this.getBalanceUseCase.execute({
      userId: req.user.id
    });
  }
}
```

## References

- [NestJS Versioning Documentation](https://docs.nestjs.com/techniques/versioning)
- [API Versioning Best Practices](https://www.troyhunt.com/your-api-versioning-is-wrong-which-is/)
- [Semantic Versioning](https://semver.org/)

## Questions?

Contact the backend team or create an issue in the repository.
