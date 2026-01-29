# Run Session Migration - Quick Guide

## Prerequisites

Before running the migration, ensure:
1. PostgreSQL is running
2. Database exists with `auth` schema
3. Previous migrations are completed
4. Environment variables are configured

## Step 1: Check Current Migration Status

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run migration:show
```

Expected output should show:
```
[ ] CreateDevicesTable1741100000000
[ ] CreateBeneficiariesTable1741200000000
[ ] CreateSessionsTable1741300000000
[ ] CreateFeatureFlagsTable1741400000000
```

## Step 2: Run Migrations

Run all pending migrations:
```bash
npm run migration:run
```

Or run specific migration:
```bash
npm run typeorm migration:run -- --transaction all
```

## Step 3: Verify Migration Success

Check migration status again:
```bash
npm run migration:show
```

Expected output:
```
[X] CreateSessionsTable1741300000000
```

## Step 4: Verify Table Creation

Connect to PostgreSQL and verify:
```bash
psql $DATABASE_URL

# In psql:
\c your_database_name
SET search_path TO auth;
\d sessions

# Expected: Table structure with all columns and indexes
```

## Step 5: Test the API

Start the development server:
```bash
npm run start:dev
```

The session endpoints should now be available:
- `GET /api/v1/sessions`
- `DELETE /api/v1/sessions/:id`
- `DELETE /api/v1/sessions`

## Rollback (If Needed)

If something goes wrong:
```bash
npm run migration:revert
```

This will revert only the last migration.

## Common Issues

### Issue: Migration Already Exists
**Solution**: The table might already exist. Check with:
```sql
SELECT * FROM auth.sessions LIMIT 1;
```

### Issue: Foreign Key Constraint Fails
**Solution**: Ensure users and devices tables exist:
```sql
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM auth.devices;
```

### Issue: Schema Not Found
**Solution**: Create the auth schema:
```sql
CREATE SCHEMA IF NOT EXISTS auth;
```

## Next Steps After Migration

1. **Integrate with Auth Service**: Update login flow to create sessions
2. **Test Token Refresh**: Verify session validation works
3. **Test Logout**: Verify session revocation works
4. **Monitor Logs**: Check scheduled cleanup job runs hourly
5. **Review Docs**: Read `/src/modules/session/README.md`

## Quick Test

After migration, you can manually test the table:

```sql
-- Insert a test session
INSERT INTO auth.sessions (
  user_id,
  refresh_token_hash,
  ip_address,
  user_agent,
  expires_at
) VALUES (
  'user-uuid-here',
  'test-hash',
  '127.0.0.1',
  'test-agent',
  NOW() + INTERVAL '7 days'
);

-- Verify insert
SELECT * FROM auth.sessions;

-- Cleanup test data
DELETE FROM auth.sessions WHERE refresh_token_hash = 'test-hash';
```

## Monitoring

After deployment, monitor:

```sql
-- Active sessions count
SELECT COUNT(*) FROM auth.sessions WHERE is_active = true;

-- Sessions per user
SELECT user_id, COUNT(*)
FROM auth.sessions
WHERE is_active = true
GROUP BY user_id
ORDER BY COUNT(*) DESC;

-- Expired but not cleaned
SELECT COUNT(*)
FROM auth.sessions
WHERE is_active = true
AND expires_at < NOW();
```

## Need Help?

- Review implementation: `PHASE4_SESSION_IMPLEMENTATION.md`
- Check module docs: `src/modules/session/README.md`
- View migration: `src/database/migrations/1741300000000-CreateSessionsTable.ts`
