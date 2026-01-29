# Feature Flags Module

Phase 5 implementation of the JoonaPay database schema enhancements.

## Overview

The Feature Flags module enables controlled feature rollouts, A/B testing, and gradual user adoption through a flexible, multi-dimensional targeting system.

## Features

- **Global On/Off**: Enable or disable features globally
- **Percentage Rollout**: Gradual rollout to a percentage of users (deterministic hashing)
- **User Whitelisting**: Force-enable features for specific users
- **User Blacklisting**: Force-disable features for specific users
- **Geographic Targeting**: Restrict features to specific countries
- **Platform Targeting**: Enable features per platform (iOS, Android, Web)
- **Version Gating**: Require minimum app version
- **Time Windows**: Schedule feature activation/deactivation
- **In-Memory Cache**: Fast evaluation with automatic refresh
- **Metadata Support**: Store custom configuration

## Architecture

```
feature-flag/
├── domain/
│   ├── entities/
│   │   └── feature-flag.entity.ts          # Core business logic
│   └── repositories/
│       └── feature-flag.repository.ts      # Repository interface
├── infrastructure/
│   ├── orm-entities/
│   │   └── feature-flag.orm-entity.ts      # TypeORM entity
│   ├── mappers/
│   │   └── feature-flag.mapper.ts          # Domain ↔ ORM mapping
│   └── repositories/
│       └── feature-flag.repository.ts      # Repository implementation
└── application/
    ├── services/
    │   └── feature-flag.service.ts         # Application service
    ├── controllers/
    │   └── feature-flag.controller.ts      # REST API endpoints
    └── dto/
        └── requests/
            └── update-feature-flag.dto.ts  # Request validation
```

## Database Schema

```sql
CREATE TABLE "system"."feature_flags" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "key" varchar(100) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "description" text,
  "is_enabled" boolean DEFAULT false,
  "rollout_percentage" integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  "enabled_user_ids" uuid[] DEFAULT '{}',
  "disabled_user_ids" uuid[] DEFAULT '{}',
  "enabled_countries" varchar(3)[] DEFAULT '{}',
  "min_app_version" varchar(20),
  "platforms" varchar(20)[] DEFAULT '{}',
  "starts_at" timestamp,
  "ends_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

## API Endpoints

### User Endpoints (Authenticated)

#### Check Single Feature
```http
GET /api/v1/feature-flags/check/:key?appVersion=1.0.0&platform=ios
Authorization: Bearer {token}
```

Response:
```json
{
  "key": "external_transfers",
  "enabled": true
}
```

#### Get All Features for User
```http
GET /api/v1/feature-flags/me?appVersion=1.0.0&platform=ios
Authorization: Bearer {token}
```

Response:
```json
{
  "two_factor_auth": false,
  "external_transfers": true,
  "bill_payments": true,
  "savings_pots": false,
  "merchant_payments": true,
  "recurring_transfers": true,
  "payment_links": true,
  "referral_program": false
}
```

### Admin Endpoints (Authenticated + Admin Role)

#### List All Flags
```http
GET /api/v1/admin/feature-flags
Authorization: Bearer {admin-token}
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "key": "external_transfers",
    "name": "External Wallet Transfers",
    "description": "Allow transfers to external crypto wallets",
    "isEnabled": true,
    "rolloutPercentage": 100,
    "enabledUserIds": [],
    "disabledUserIds": [],
    "enabledCountries": ["CIV", "SEN", "MLI"],
    "minAppVersion": "1.0.0",
    "platforms": ["ios", "android"],
    "startsAt": null,
    "endsAt": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T00:00:00.000Z"
  }
]
```

#### Get Single Flag
```http
GET /api/v1/admin/feature-flags/:key
Authorization: Bearer {admin-token}
```

#### Update Flag
```http
PUT /api/v1/admin/feature-flags/:key
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "isEnabled": true,
  "rolloutPercentage": 50,
  "enabledCountries": ["CIV", "SEN"],
  "platforms": ["ios", "android"],
  "minAppVersion": "2.0.0",
  "startsAt": "2025-02-01T00:00:00Z",
  "endsAt": "2025-03-01T00:00:00Z"
}
```

## Evaluation Logic

Features are evaluated in the following order:

1. **Global Flag**: If `is_enabled = false`, return `false`
2. **Time Window**: Check if current time is within `starts_at` and `ends_at`
3. **User Blacklist**: If user in `disabled_user_ids`, return `false`
4. **User Whitelist**: If user in `enabled_user_ids`, return `true` (bypasses all other checks)
5. **Country**: If `enabled_countries` is set, check if user's country matches
6. **Platform**: If `platforms` is set, check if user's platform matches
7. **App Version**: If `min_app_version` is set, check if user's version >= min
8. **Percentage Rollout**: Hash user ID deterministically and check if in rollout bucket

## Usage Examples

### Service Injection

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagService } from '@/modules/feature-flag';

@Injectable()
export class TransferService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async createTransfer(userId: string, data: TransferDto) {
    // Check if external transfers are enabled for this user
    const canTransferExternal = await this.featureFlagService.isEnabled(
      'external_transfers',
      { userId }
    );

    if (!canTransferExternal && data.isExternal) {
      throw new ForbiddenException('External transfers not enabled');
    }

    // Process transfer...
  }
}
```

### Guards

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { FeatureFlagService } from '@/modules/feature-flag';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return this.featureFlagService.isEnabled('savings_pots', {
      userId: user.id,
      countryCode: user.countryCode,
    });
  }
}

// Usage in controller
@Post('savings-pots')
@UseGuards(JwtAuthGuard, FeatureGuard)
async createSavingsPot(@CurrentUser() user: User, @Body() dto: CreatePotDto) {
  // Only accessible if savings_pots feature is enabled
}
```

## Seeded Feature Flags

The migration seeds the following flags:

| Key | Name | Enabled | Rollout |
|-----|------|---------|---------|
| `two_factor_auth` | Two-Factor Authentication | No | 0% |
| `external_transfers` | External Wallet Transfers | Yes | 100% |
| `bill_payments` | Bill Payments | Yes | 100% |
| `savings_pots` | Savings Pots | No | 0% |
| `biometric_auth` | Biometric Authentication | Yes | 100% |
| `mobile_money_withdrawals` | Mobile Money Withdrawals | Yes | 100% |
| `referral_program` | Referral Program | Yes | 100% |
| `merchant_payments` | Merchant QR Payments | Yes | 100% |

## Performance

- **In-Memory Cache**: All flags cached in memory on startup
- **Cache Refresh**: Automatic refresh after updates (5-minute TTL)
- **Deterministic Hashing**: Percentage rollout uses MD5 hash for consistent results
- **Fast Evaluation**: O(1) lookup with simple boolean checks

## Testing

Run unit tests:
```bash
npm test feature-flag.service.spec.ts
```

Test coverage includes:
- Global on/off toggle
- Percentage rollout determinism
- User whitelist/blacklist
- Geographic restrictions
- Platform restrictions
- Version gating
- Time windows
- Cache behavior

## Migration

Apply the migration:
```bash
npm run migration:run
```

Revert the migration:
```bash
npm run migration:revert
```

## Best Practices

1. **Use Descriptive Keys**: `snake_case` naming (e.g., `external_transfers`)
2. **Start Disabled**: New features should default to `isEnabled: false`
3. **Gradual Rollout**: Increase rollout percentage incrementally (10% → 25% → 50% → 100%)
4. **Test Users**: Use `enabledUserIds` for internal testing before public rollout
5. **Monitor Metrics**: Track feature usage and errors before full rollout
6. **Cleanup Old Flags**: Remove feature flags after full rollout or deprecation
7. **Document Changes**: Log all flag updates for audit trail

## Common Scenarios

### Canary Deployment
```typescript
// Enable for 5% of users
await featureFlagService.updateFlag('new_dashboard', {
  isEnabled: true,
  rolloutPercentage: 5,
});

// Monitor metrics, then increase
await featureFlagService.updateFlag('new_dashboard', {
  rolloutPercentage: 25,
});
```

### Beta Testing
```typescript
// Enable for specific beta testers
await featureFlagService.enableForUser('beta_feature', 'user-123');
await featureFlagService.enableForUser('beta_feature', 'user-456');
```

### Regional Launch
```typescript
// Launch in Côte d'Ivoire first
await featureFlagService.updateFlag('new_payment_method', {
  isEnabled: true,
  enabledCountries: ['CIV'],
  rolloutPercentage: 100,
});
```

### Scheduled Release
```typescript
// Launch at midnight on Feb 1st
await featureFlagService.updateFlag('promo_campaign', {
  isEnabled: true,
  startsAt: new Date('2025-02-01T00:00:00Z'),
  endsAt: new Date('2025-02-28T23:59:59Z'),
});
```

## Security

- Admin endpoints require admin role (implement role guard)
- User endpoints only show computed boolean values (no internal configuration)
- Audit log recommended for flag changes
- Use HTTPS for all API calls

## Monitoring

Recommended metrics:
- Feature flag evaluation time
- Cache hit/miss rates
- Feature adoption rates per user segment
- Error rates correlated with flag changes

## Future Enhancements

- [ ] Add audit logging for flag changes
- [ ] Implement webhook notifications on flag updates
- [ ] Add A/B testing variant support
- [ ] Create admin dashboard UI
- [ ] Add flag dependency management
- [ ] Implement flag archival for cleanup
