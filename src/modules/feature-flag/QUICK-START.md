# Feature Flags Quick Start Guide

> 5-minute guide to using feature flags in JoonaPay

## For Developers

### 1. Check if Feature is Enabled

```typescript
import { FeatureFlagService } from '@/modules/feature-flag';

// In your service
constructor(private readonly featureFlagService: FeatureFlagService) {}

// Check feature
const isEnabled = await this.featureFlagService.isEnabled('feature_key', {
  userId: 'user-id',
  countryCode: 'CIV',
  appVersion: '1.0.0',
  platform: 'ios'
});

if (isEnabled) {
  // Feature is enabled
}
```

### 2. Protect Routes

```typescript
import { FeatureGuard, RequireFeature } from '@/common/guards/feature.guard';

@Controller('savings')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class SavingsController {
  @Post('pots')
  @RequireFeature('savings_pots')
  async createPot(@Body() dto: CreatePotDto) {
    // Only accessible if savings_pots is enabled
  }
}
```

### 3. Get All User Features

```typescript
// Get all features for user context
const features = await this.featureFlagService.getEnabledFlagsForContext({
  userId: user.id,
  countryCode: user.countryCode
});

// Returns: { external_transfers: true, bill_payments: true, ... }
```

## For Mobile Developers

### Initialize on App Start

```dart
// Fetch all flags
final response = await dio.get(
  '/api/v1/feature-flags/me',
  queryParameters: {
    'appVersion': '1.0.0',
    'platform': Platform.isIOS ? 'ios' : 'android',
  },
);

Map<String, bool> features = Map<String, bool>.from(response.data);
```

### Check Feature

```dart
if (features['savings_pots'] == true) {
  // Show savings tab
}
```

## For Admins

### Enable Feature Globally

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true, "rolloutPercentage": 100}' \
  "http://localhost:3000/api/v1/admin/feature-flags/savings_pots"
```

### Gradual Rollout

```bash
# Start with 10%
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true, "rolloutPercentage": 10}' \
  "http://localhost:3000/api/v1/admin/feature-flags/new_feature"

# Increase to 50%
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 50}' \
  "http://localhost:3000/api/v1/admin/feature-flags/new_feature"
```

### Enable for Specific Users

```sql
-- Add user to whitelist
UPDATE system.feature_flags
SET enabled_user_ids = array_append(enabled_user_ids, 'user-id-here'::uuid)
WHERE key = 'beta_feature';
```

### Regional Rollout

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true, "enabledCountries": ["CIV", "SEN"]}' \
  "http://localhost:3000/api/v1/admin/feature-flags/new_feature"
```

## Available Flags

| Key | Description | Default |
|-----|-------------|---------|
| `external_transfers` | External wallet transfers | ✅ Enabled |
| `bill_payments` | Bill payment functionality | ✅ Enabled |
| `merchant_payments` | Merchant QR payments | ✅ Enabled |
| `mobile_money_withdrawals` | Mobile money withdrawals | ✅ Enabled |
| `biometric_auth` | Biometric authentication | ✅ Enabled |
| `referral_program` | User referral system | ✅ Enabled |
| `savings_pots` | Savings pots feature | ❌ Disabled |
| `two_factor_auth` | Two-factor authentication | ❌ Disabled |

## Common Patterns

### Pattern 1: Feature Toggle
```typescript
if (await this.featureFlagService.isEnabled('new_ui', { userId })) {
  return this.getNewUI();
}
return this.getLegacyUI();
```

### Pattern 2: Early Access
```typescript
// Enable for beta testers
const isBetaTester = await this.featureFlagService.isEnabled('beta_feature', { userId });

if (!isBetaTester) {
  throw new ForbiddenException('Contact support for early access');
}
```

### Pattern 3: Regional Features
```typescript
const canUseFeature = await this.featureFlagService.isEnabled('xof_mobile_money', {
  userId,
  countryCode: user.countryCode, // Only available in CIV, SEN, MLI
});
```

## Testing

### Mock in Tests
```typescript
const mockFeatureFlagService = {
  isEnabled: jest.fn().mockResolvedValue(true),
};

const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: FeatureFlagService, useValue: mockFeatureFlagService },
  ],
}).compile();
```

## Emergency Disable

```sql
-- Instantly disable a feature
UPDATE system.feature_flags
SET is_enabled = false
WHERE key = 'problematic_feature';

-- Application cache will refresh within 5 minutes
-- Or restart app for immediate effect
```

## Need Help?

- 📖 **Full Documentation:** `src/modules/feature-flag/README.md`
- 🚀 **Deployment Guide:** `src/modules/feature-flag/DEPLOYMENT.md`
- 🔧 **Integration Guide:** `src/modules/feature-flag/INTEGRATION.md`
- 📊 **Summary:** `PHASE5-SUMMARY.md`

## Quick Reference

### Evaluation Order
1. Global enabled/disabled
2. Time window
3. User blacklist
4. User whitelist (bypasses other checks)
5. Country restrictions
6. Platform restrictions
7. Version requirements
8. Percentage rollout

### Context Parameters
```typescript
interface EvaluationContext {
  userId?: string;        // Required for percentage rollout
  countryCode?: string;   // ISO 3166-1 alpha-3 (e.g., 'CIV')
  appVersion?: string;    // Semantic version (e.g., '1.0.0')
  platform?: string;      // 'ios' | 'android' | 'web'
}
```

### Response Codes
- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (feature not available)
- `404` - Feature flag not found (admin endpoints)

---

**Last Updated:** January 29, 2025
**Version:** 1.0.0
