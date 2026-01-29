# Feature Flags Deployment Guide

## Pre-Deployment Checklist

- [ ] Review migration file: `1741400000000-CreateFeatureFlagsTable.ts`
- [ ] Ensure PostgreSQL has `system` schema
- [ ] Verify `uuid-ossp` extension is enabled
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Review seeded feature flags
- [ ] Update environment variables if needed

## Deployment Steps

### 1. Run Migration

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet

# Check pending migrations
npm run typeorm migration:show

# Run the migration
npm run migration:run

# Verify migration was applied
npm run typeorm migration:show
```

### 2. Verify Database Schema

```sql
-- Connect to database
psql $DATABASE_URL

-- Verify table exists
\dt system.feature_flags

-- Check table structure
\d system.feature_flags

-- Verify indexes
\di system.feature_flags*

-- Check seeded data
SELECT key, name, is_enabled, rollout_percentage
FROM system.feature_flags
ORDER BY key;
```

Expected output:
```
              key               |            name            | is_enabled | rollout_percentage
--------------------------------+----------------------------+------------+--------------------
 bill_payments                  | Bill Payments              | t          |                100
 biometric_auth                 | Biometric Authentication   | t          |                100
 external_transfers             | External Wallet Transfers  | t          |                100
 merchant_payments              | Merchant QR Payments       | t          |                100
 mobile_money_withdrawals       | Mobile Money Withdrawals   | t          |                100
 referral_program               | Referral Program           | t          |                100
 savings_pots                   | Savings Pots               | f          |                  0
 two_factor_auth                | Two-Factor Authentication  | f          |                  0
```

### 3. Register Module

The module is already registered in `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts`.

Verify:
```bash
grep -n "FeatureFlagModule" src/app.module.ts
```

### 4. Start Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 5. Verify API Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Test User Endpoint (requires auth)
```bash
# Get JWT token first (login/register)
TOKEN="your-jwt-token"

# Get all features for user
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/feature-flags/me?appVersion=1.0.0&platform=ios"

# Check specific feature
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/feature-flags/check/external_transfers"
```

Expected response:
```json
{
  "key": "external_transfers",
  "enabled": true
}
```

#### Test Admin Endpoint (requires admin auth)
```bash
ADMIN_TOKEN="your-admin-jwt-token"

# List all flags
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/v1/admin/feature-flags"

# Get specific flag
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/v1/admin/feature-flags/external_transfers"

# Update flag
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true, "rolloutPercentage": 50}' \
  "http://localhost:3000/api/v1/admin/feature-flags/recurring_transfers"
```

### 6. Monitor Cache Initialization

Check application logs for cache initialization:
```bash
tail -f logs/application.log | grep "FeatureFlagService"
```

Expected log output:
```
[FeatureFlagService] Refreshed feature flags cache: 8 flags
```

## Verification Queries

### Check Flag Evaluation Logic

```sql
-- Flag with 100% rollout (should be enabled for all users)
SELECT key, is_enabled, rollout_percentage
FROM system.feature_flags
WHERE key = 'external_transfers';

-- Flag with 0% rollout (should be disabled for all users unless whitelisted)
SELECT key, is_enabled, rollout_percentage
FROM system.feature_flags
WHERE key = 'two_factor_auth';

-- Check user whitelists
SELECT key, array_length(enabled_user_ids, 1) as enabled_count
FROM system.feature_flags
WHERE array_length(enabled_user_ids, 1) > 0;

-- Check geographic restrictions
SELECT key, enabled_countries
FROM system.feature_flags
WHERE array_length(enabled_countries, 1) > 0;

-- Check platform restrictions
SELECT key, platforms
FROM system.feature_flags
WHERE array_length(platforms, 1) > 0;

-- Check time-based features
SELECT key, starts_at, ends_at
FROM system.feature_flags
WHERE starts_at IS NOT NULL OR ends_at IS NOT NULL;
```

## Testing Scenarios

### Test 1: Global On/Off
```sql
-- Disable external_transfers globally
UPDATE system.feature_flags
SET is_enabled = false
WHERE key = 'external_transfers';

-- Test via API (should return false)
-- curl -H "Authorization: Bearer $TOKEN" \
--   "http://localhost:3000/api/v1/feature-flags/check/external_transfers"

-- Re-enable
UPDATE system.feature_flags
SET is_enabled = true
WHERE key = 'external_transfers';
```

### Test 2: User Whitelist
```sql
-- Add user to whitelist
UPDATE system.feature_flags
SET enabled_user_ids = array_append(enabled_user_ids, 'user-id-here'::uuid)
WHERE key = 'savings_pots';

-- Verify
SELECT key, enabled_user_ids
FROM system.feature_flags
WHERE key = 'savings_pots';
```

### Test 3: Percentage Rollout
```sql
-- Set 50% rollout
UPDATE system.feature_flags
SET is_enabled = true, rollout_percentage = 50
WHERE key = 'recurring_transfers';

-- Test with multiple user IDs
-- Some should get true, some false, but same user always gets same result
```

### Test 4: Geographic Targeting
```sql
-- Limit to Côte d'Ivoire and Senegal
UPDATE system.feature_flags
SET enabled_countries = ARRAY['CIV', 'SEN']
WHERE key = 'merchant_payments';

-- Test with different country codes
-- Only CIV and SEN users should get true
```

### Test 5: Version Gating
```sql
-- Require version 2.0.0
UPDATE system.feature_flags
SET min_app_version = '2.0.0'
WHERE key = 'bill_payments';

-- Test with different app versions
-- appVersion=1.9.0 should get false
-- appVersion=2.0.0 should get true
-- appVersion=2.1.0 should get true
```

### Test 6: Time Window
```sql
-- Schedule feature for future
UPDATE system.feature_flags
SET
  starts_at = NOW() + INTERVAL '1 day',
  ends_at = NOW() + INTERVAL '30 days'
WHERE key = 'referral_program';

-- Should return false until starts_at
-- Should return true between starts_at and ends_at
-- Should return false after ends_at
```

## Rollback Procedure

If issues arise:

```bash
# Revert migration
npm run migration:revert

# Or manually drop table
psql $DATABASE_URL -c "DROP TABLE system.feature_flags CASCADE;"
```

## Post-Deployment

### 1. Monitor Logs
```bash
# Watch for errors
tail -f logs/error.log | grep -i feature

# Watch for flag evaluations
tail -f logs/application.log | grep FeatureFlagService
```

### 2. Performance Metrics

Monitor:
- API response times for `/feature-flags/*` endpoints
- Cache hit rates
- Database query performance
- Memory usage (cache stores all flags in memory)

### 3. Update Documentation

- [ ] Update API documentation
- [ ] Inform mobile team about new endpoints
- [ ] Update admin dashboard to use feature flags
- [ ] Document flag management procedures

### 4. Create Admin Procedures

Document how to:
- Add new feature flags
- Gradually roll out features
- Whitelist beta testers
- Emergency disable features
- Archive deprecated flags

## Common Issues

### Issue 1: Schema Not Found
```
ERROR: schema "system" does not exist
```

**Solution:**
```sql
CREATE SCHEMA IF NOT EXISTS system;
```

### Issue 2: UUID Extension Not Available
```
ERROR: function uuid_generate_v4() does not exist
```

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue 3: Cache Not Refreshing
**Solution:**
```bash
# Restart application
npm run start:dev

# Or manually trigger refresh via service method
```

### Issue 4: Admin Endpoints Return 401
**Solution:**
Ensure admin role guard is implemented and user has admin role.

## Security Checklist

- [ ] Admin endpoints require admin role
- [ ] User endpoints don't expose sensitive config
- [ ] JWT authentication working
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] Audit logging enabled (future enhancement)

## Maintenance

### Weekly
- Review flag usage metrics
- Check for orphaned flags
- Verify cache performance

### Monthly
- Audit flag configurations
- Remove deprecated flags
- Review rollout percentages
- Update documentation

### Quarterly
- Performance optimization review
- Security audit
- User feedback analysis
- Feature cleanup

## Support

For issues:
1. Check application logs
2. Verify database schema
3. Test API endpoints manually
4. Review this deployment guide
5. Contact backend team

## Next Steps

After successful deployment:
1. Implement admin role guard
2. Add audit logging
3. Create admin dashboard
4. Set up monitoring/alerting
5. Document flag change procedures
6. Train team on feature flag usage
