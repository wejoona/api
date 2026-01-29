# Data Retention - Quick Reference

## Quick Start (3 Steps)

```bash
# 1. Run migration
npm run migration:run

# 2. Start server
npm run start:dev

# 3. Test it works
curl http://localhost:3000/data-retention/policies
```

## Common Tasks

### View Retention Policies
```bash
curl http://localhost:3000/data-retention/policies
```

### Trigger Manual Cleanup
```bash
curl -X POST http://localhost:3000/data-retention/cleanup/sessions
```

### Create User Deletion Request
```typescript
await this.retentionService.createDeletionRequest(
  userId,
  null,
  'gdpr',
  'User requested deletion',
  30 // days delay
);
```

### Update Retention Policy
```bash
curl -X PUT http://localhost:3000/data-retention/policies/sessions \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 120}'
```

### Query Excluding Soft-Deleted
```typescript
import { IsNull } from 'typeorm';

const sessions = await repo.find({
  where: { userId, deletedAt: IsNull() }
});
```

## Retention Periods Cheat Sheet

| Data | Period | Action |
|------|--------|--------|
| Sessions | 90 days | Delete |
| Verification codes | 24 hours | Delete |
| Notifications (read) | 90 days | Delete |
| Transactions | 7 years | Archive |
| User data (deleted) | 30 days | Anonymize |
| KYC docs | 7 years | Archive |

## Scheduled Jobs

| Job | Schedule | What It Does |
|-----|----------|--------------|
| Daily cleanup | 2 AM | Process all retention policies |
| Hourly | Top of hour | Process GDPR deletion requests |

## API Endpoints

```
GET    /data-retention/policies
GET    /data-retention/policies/:dataType
PUT    /data-retention/policies/:dataType
POST   /data-retention/cleanup/:dataType
POST   /data-retention/deletion-requests
GET    /data-retention/deletion-requests
GET    /data-retention/logs
```

## Database Tables

```sql
system.retention_policies       -- Policy configuration
system.data_deletion_requests   -- GDPR requests
system.data_retention_logs      -- Audit logs
```

## Monitoring Queries

```sql
-- Last job run
SELECT data_type, MAX(created_at) as last_run
FROM system.data_retention_logs
GROUP BY data_type;

-- Failed jobs
SELECT * FROM system.data_retention_logs
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days';

-- Pending deletions
SELECT * FROM system.data_deletion_requests
WHERE status = 'pending';
```

## Soft Delete Pattern

```typescript
// Phase 1: Soft delete
UPDATE table SET deleted_at = NOW()
WHERE expires_at < cutoff AND deleted_at IS NULL;

// Phase 2: Hard delete (after grace period)
DELETE FROM table
WHERE deleted_at < grace_cutoff;
```

## GDPR Deletion Flow

1. Request created → `status = 'pending'`
2. Grace period (30 days)
3. Auto-execute → `status = 'processing'`
4. Anonymize user data
5. Delete sessions, tokens
6. Complete → `status = 'completed'`

## Import Paths

```typescript
import { DataRetentionService } from '@modules/data-retention';
import { RetentionPolicyRepository } from '@modules/data-retention';
```

## Testing Commands

```bash
# View policies
curl http://localhost:3000/data-retention/policies

# Trigger sessions cleanup
curl -X POST http://localhost:3000/data-retention/cleanup/sessions

# Create test deletion
curl -X POST http://localhost:3000/data-retention/deletion-requests \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","deletionType":"admin","daysDelay":0}'

# View logs
curl http://localhost:3000/data-retention/logs
```

## Troubleshooting

**Jobs not running?**
- Check `ScheduleModule.forRoot()` in app.module.ts
- Look for cron errors in logs

**Deletion stuck?**
```sql
UPDATE system.data_deletion_requests
SET status = 'pending'
WHERE id = 'stuck-id';
```

**Soft delete not working?**
- Verify `deleted_at` column exists
- Always use `deletedAt: IsNull()` in queries

## File Locations

```
Migration:     src/database/migrations/1742300000000-CreateDataRetentionTables.ts
Service:       src/modules/data-retention/application/services/data-retention.service.ts
Controller:    src/modules/data-retention/application/controllers/data-retention.controller.ts
Docs:          DATA_RETENTION_POLICY.md, GDPR_COMPLIANCE.md
```

## Need More Info?

- **Setup:** `IMPLEMENTATION_GUIDE.md`
- **Module docs:** `src/modules/data-retention/README.md`
- **Full policy:** `DATA_RETENTION_POLICY.md`
- **GDPR:** `GDPR_COMPLIANCE.md`
- **Summary:** `DATA_RETENTION_SUMMARY.md`
