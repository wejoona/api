# Data Retention Implementation Guide

## Quick Start

### 1. Run Migration

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run migration:run
```

This creates:
- `system.retention_policies` table with default policies
- `system.data_deletion_requests` table for GDPR requests
- `system.data_retention_logs` table for audit logs
- Adds `deleted_at` columns to sessions, verifications, webhook_deadletters

### 2. Verify Module Registration

The `DataRetentionModule` is already registered in `app.module.ts`.

### 3. Start the Server

```bash
npm run start:dev
```

The scheduled jobs will start automatically:
- Daily cleanup at 2 AM: Processes all retention policies
- Hourly: Processes pending deletion requests

## Testing the Implementation

### 1. View Default Policies

```bash
curl http://localhost:3000/data-retention/policies \
  -H "Authorization: Bearer {admin-token}"
```

Expected response:
```json
{
  "policies": [
    {
      "dataType": "sessions",
      "retentionDays": 90,
      "action": "delete",
      "gracePeriodDays": 0,
      "isEnabled": true
    },
    // ... other policies
  ]
}
```

### 2. Test Manual Cleanup

```bash
# Trigger cleanup for sessions
curl -X POST http://localhost:3000/data-retention/cleanup/sessions \
  -H "Authorization: Bearer {admin-token}"
```

### 3. Create a Test Deletion Request

```bash
curl -X POST http://localhost:3000/data-retention/deletion-requests \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-uuid",
    "deletionType": "gdpr",
    "reason": "Testing GDPR deletion flow",
    "daysDelay": 0
  }'
```

### 4. View Retention Logs

```bash
curl http://localhost:3000/data-retention/logs \
  -H "Authorization: Bearer {admin-token}"
```

### 5. Check Database

```sql
-- View retention policies
SELECT * FROM system.retention_policies;

-- View deletion requests
SELECT * FROM system.data_deletion_requests;

-- View retention logs
SELECT * FROM system.data_retention_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check soft-deleted sessions
SELECT id, user_id, expires_at, deleted_at
FROM auth.sessions
WHERE deleted_at IS NOT NULL;
```

## Integration with Existing Code

### 1. User Account Deletion

Add to your user service:

```typescript
import { DataRetentionService } from '@modules/data-retention';

@Injectable()
export class UserService {
  constructor(
    private readonly retentionService: DataRetentionService,
  ) {}

  async requestAccountDeletion(userId: string): Promise<void> {
    // Create deletion request with 30-day grace period
    await this.retentionService.createDeletionRequest(
      userId,
      userId, // User initiated
      'gdpr',
      'User requested account deletion',
      30,
    );

    // Notify user
    // Send email confirmation with cancellation link
  }
}
```

### 2. Admin-Initiated Deletion

```typescript
async deleteUserAccount(
  userId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  await this.retentionService.createDeletionRequest(
    userId,
    adminId,
    'admin',
    reason,
    7, // 7-day delay for admin deletions
  );
}
```

### 3. Query Active Data (Exclude Soft-Deleted)

When querying data that might be soft-deleted:

```typescript
// Sessions
const sessions = await this.sessionRepository.find({
  where: {
    userId,
    deletedAt: IsNull(), // Exclude soft-deleted
  },
});

// Verifications
const verifications = await this.verificationRepository.find({
  where: {
    identifier,
    deletedAt: IsNull(),
  },
});
```

## Configuring Retention Policies

### Update a Policy

```bash
curl -X PUT http://localhost:3000/data-retention/policies/sessions \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "retentionDays": 120,
    "isEnabled": true
  }'
```

### Disable a Policy

```bash
curl -X PUT http://localhost:3000/data-retention/policies/notifications \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": false
  }'
```

### Add a New Data Type

```sql
INSERT INTO system.retention_policies (
  data_type,
  retention_days,
  action,
  grace_period_days,
  description,
  compliance_requirement
) VALUES (
  'payment_links',
  365,
  'archive',
  30,
  'Payment links older than 1 year',
  'Business requirement'
);
```

Then implement the cleanup handler in `DataRetentionService`:

```typescript
case 'payment_links':
  result = await this.cleanupPaymentLinks(policy.getCutoffDate());
  break;
```

## Monitoring

### Daily Health Check

```sql
-- Check if jobs are running
SELECT
  job_name,
  data_type,
  COUNT(*) as runs,
  MAX(created_at) as last_run,
  AVG(records_processed) as avg_records
FROM system.data_retention_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY job_name, data_type
ORDER BY last_run DESC;
```

### Failed Jobs

```sql
SELECT *
FROM system.data_retention_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Pending Deletion Requests

```sql
SELECT
  id,
  user_id,
  deletion_type,
  status,
  scheduled_for,
  created_at
FROM system.data_deletion_requests
WHERE status = 'pending'
  AND scheduled_for < NOW();
```

### Storage Reclaimed

```sql
-- Sessions cleaned up in last 30 days
SELECT
  SUM(records_deleted) as total_deleted
FROM system.data_retention_logs
WHERE data_type = 'sessions'
  AND created_at > NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Jobs Not Running

**Check scheduler is enabled:**
```typescript
// In app.module.ts
imports: [
  ScheduleModule.forRoot(), // ✅ Should be present
]
```

**Check logs:**
```bash
# Look for cron job execution
tail -f logs/app.log | grep "data_retention"
```

### Deletion Request Stuck

```sql
-- Find stuck requests
SELECT * FROM system.data_deletion_requests
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '1 hour';

-- Manually retry
UPDATE system.data_deletion_requests
SET status = 'pending'
WHERE id = 'stuck-request-id';
```

### Soft Deletes Not Working

**Verify column exists:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name = 'deleted_at';
```

**Check query filters:**
```typescript
// Always exclude soft-deleted records
where: {
  userId,
  deletedAt: IsNull(), // ✅ Required
}
```

## Performance Considerations

### Index Usage

The migration creates indexes for:
- `deleted_at IS NULL` (for active record queries)
- `expires_at` (for retention cleanup)
- `scheduled_for` (for deletion requests)

### Batch Processing

Cleanup jobs process in batches to avoid locking:

```typescript
// Process in chunks of 1000
const batchSize = 1000;
let offset = 0;

while (true) {
  const batch = await repository
    .createQueryBuilder()
    .where('expires_at < :cutoff', { cutoff })
    .skip(offset)
    .take(batchSize)
    .getMany();

  if (batch.length === 0) break;

  // Process batch
  await processBatch(batch);

  offset += batchSize;
}
```

### Query Optimization

**Good:**
```typescript
// Use indexes
await repository.find({
  where: {
    expiresAt: LessThan(cutoffDate),
    deletedAt: IsNull(),
  },
});
```

**Bad:**
```typescript
// Full table scan
const all = await repository.find();
const filtered = all.filter(s => s.expiresAt < cutoffDate);
```

## Security Checklist

- [ ] Admin authentication enabled on all endpoints
- [ ] Audit trails logged for all deletions
- [ ] Grace periods configured for critical data
- [ ] Financial data retention meets compliance requirements
- [ ] User notifications sent for deletion requests
- [ ] Backup strategy includes retention logs
- [ ] Rate limiting on deletion endpoints
- [ ] GDPR deletion request validation

## Production Deployment

### Pre-Deployment

1. **Run migration in staging:**
   ```bash
   npm run migration:run
   ```

2. **Test manual triggers:**
   ```bash
   curl -X POST https://staging.api/data-retention/cleanup/sessions
   ```

3. **Verify scheduled jobs:**
   - Wait 24 hours to ensure daily job runs
   - Check retention logs for execution

4. **Load test:**
   - Create 1000 test deletion requests
   - Verify processing time
   - Check database impact

### Deployment

1. **Run migration:**
   ```bash
   npm run migration:run
   ```

2. **Deploy code:**
   ```bash
   npm run build
   npm run start:prod
   ```

3. **Verify:**
   ```bash
   # Check policies loaded
   curl https://api.joonapay.com/data-retention/policies
   ```

### Post-Deployment

1. **Monitor first 24 hours:**
   - Daily job execution at 2 AM
   - Hourly deletion request processing
   - Error logs

2. **Review metrics:**
   - Records processed
   - Execution time
   - Storage reclaimed

3. **User communication:**
   - Announce GDPR deletion feature
   - Update privacy policy
   - Add help center articles

## Legal Compliance

### GDPR Checklist

- [x] Right to erasure implemented (Article 17)
- [x] Automated retention policies
- [x] Audit trails for data processing
- [x] 30-day grace period for deletions
- [ ] User-facing deletion request UI (mobile app)
- [ ] Privacy policy updated
- [ ] Data export API (Article 15)

### Financial Regulation Checklist

- [x] 7-year transaction retention
- [x] KYC document archival
- [x] Audit log preservation
- [x] Anonymization (not deletion) of financial data

### Next Steps

1. **Add to mobile app:**
   - Account deletion button in settings
   - Grace period UI
   - Deletion confirmation flow

2. **User notifications:**
   - Email confirmation of deletion request
   - Countdown to deletion date
   - Cancellation link

3. **Admin dashboard:**
   - View pending deletions
   - Approve/reject admin-initiated deletions
   - Retention policy management UI

4. **Monitoring:**
   - Set up alerts for failed jobs
   - Dashboard for retention metrics
   - Weekly compliance reports

## Support

**Technical Issues:**
- GitHub: [repo]/issues
- Email: engineering@joonapay.com

**Compliance Questions:**
- Email: compliance@joonapay.com
- DPO: dpo@joonapay.com

**Emergency:**
- On-call: [On-call number]
- Slack: #engineering-oncall
