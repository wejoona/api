# Data Retention Module

## Overview

The Data Retention module implements automated data lifecycle management for JoonaPay, ensuring compliance with GDPR, financial regulations, and security best practices.

## Features

- **Configurable Retention Policies**: Define retention periods per data type
- **Automated Cleanup Jobs**: Daily, hourly, and weekly scheduled jobs
- **Soft Delete Pattern**: Grace periods before permanent deletion
- **GDPR Right to Erasure**: User data deletion requests
- **Audit Trails**: Complete logging of all retention activities
- **Three Actions**: Delete, Anonymize, Archive

## Directory Structure

```
data-retention/
├── application/
│   ├── controllers/
│   │   └── data-retention.controller.ts  # Admin API endpoints
│   ├── services/
│   │   └── data-retention.service.ts     # Core retention logic
│   └── dto/
│       ├── create-deletion-request.dto.ts
│       └── update-retention-policy.dto.ts
├── domain/
│   ├── entities/
│   │   └── retention-policy.entity.ts
│   └── repositories/
│       └── retention-policy.repository.ts
├── infrastructure/
│   ├── orm-entities/
│   │   ├── retention-policy.orm-entity.ts
│   │   ├── data-deletion-request.orm-entity.ts
│   │   └── data-retention-log.orm-entity.ts
│   └── repositories/
│       └── typeorm-retention-policy.repository.ts
├── data-retention.module.ts
└── README.md
```

## Retention Policies

### Default Policies

| Data Type | Retention | Action | Grace Period |
|-----------|-----------|--------|--------------|
| sessions | 90 days | delete | 0 days |
| verification_codes | 1 day | delete | 0 days |
| webhook_logs | 30 days | archive | 7 days |
| transaction_logs | 7 years | archive | 30 days |
| audit_logs | 7 years | archive | 30 days |
| user_data | 30 days after deletion | anonymize | 30 days |
| kyc_documents | 7 years | archive | 30 days |
| notifications | 90 days | delete | 0 days |
| fcm_tokens | 30 days inactive | delete | 0 days |
| device_metadata | 180 days inactive | anonymize | 30 days |

## Scheduled Jobs

### Daily Cleanup (2 AM)
```typescript
@Cron('0 2 * * *')
async dailyRetentionCleanup(): Promise<void>
```

Processes all enabled retention policies:
- Soft deletes expired data
- Hard deletes past grace period
- Logs all actions

### Hourly Deletion Requests (Top of Hour)
```typescript
@Cron(CronExpression.EVERY_HOUR)
async processPendingDeletionRequests(): Promise<void>
```

Processes GDPR deletion requests that have reached their scheduled time.

## API Endpoints

### Get Retention Policies
```http
GET /data-retention/policies
Authorization: Bearer {admin-token}
```

### Update Policy
```http
PUT /data-retention/policies/:dataType
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "retentionDays": 120,
  "isEnabled": true
}
```

### Trigger Manual Cleanup
```http
POST /data-retention/cleanup/:dataType
Authorization: Bearer {admin-token}
```

### Create Deletion Request (GDPR)
```http
POST /data-retention/deletion-requests
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "deletionType": "gdpr",
  "reason": "User requested account deletion",
  "daysDelay": 30
}
```

### Get Deletion Requests
```http
GET /data-retention/deletion-requests?status=pending
Authorization: Bearer {admin-token}
```

### View Retention Logs
```http
GET /data-retention/logs?dataType=sessions&limit=100
Authorization: Bearer {admin-token}
```

## Usage Examples

### Create a Deletion Request

```typescript
import { DataRetentionService } from '@modules/data-retention';

@Injectable()
export class UserService {
  constructor(
    private readonly retentionService: DataRetentionService,
  ) {}

  async deleteUserAccount(userId: string): Promise<void> {
    // Create deletion request with 30-day grace period
    await this.retentionService.createDeletionRequest(
      userId,
      null, // or adminUserId if admin-initiated
      'gdpr',
      'User requested account deletion',
      30, // days delay
    );
  }
}
```

### Manually Trigger Cleanup

```typescript
// Trigger cleanup for a specific data type
await this.retentionService.triggerRetentionCleanup('sessions');
```

### Query Retention Logs

```typescript
// Get recent logs for sessions cleanup
const logs = await this.retentionService.getRetentionLogs('sessions', 100);

logs.forEach(log => {
  console.log(`${log.dataType}: ${log.recordsDeleted} deleted`);
});
```

### Update Retention Policy

```typescript
import { RetentionPolicyRepository } from '@modules/data-retention';

@Injectable()
export class AdminService {
  constructor(
    private readonly policyRepo: RetentionPolicyRepository,
  ) {}

  async updateSessionRetention(): Promise<void> {
    await this.policyRepo.update('sessions', {
      retentionDays: 120, // Change from 90 to 120 days
      isEnabled: true,
    });
  }
}
```

## Soft Delete Pattern

Most data types use a two-phase deletion:

### Phase 1: Soft Delete
```typescript
// Mark as deleted
await repository.update(
  { expiresAt: LessThan(cutoffDate) },
  { deletedAt: () => 'NOW()' }
);
```

### Phase 2: Hard Delete (After Grace Period)
```typescript
// Permanently remove
const graceCutoff = new Date();
graceCutoff.setDate(graceCutoff.getDate() - gracePeriodDays);

await repository.delete({
  deletedAt: LessThan(graceCutoff)
});
```

## GDPR Deletion Process

When a user requests account deletion:

1. **Request Created**: Logged in `data_deletion_requests`
2. **Grace Period**: 30 days (configurable)
3. **Execution**:
   - Anonymize user profile
   - Delete sessions
   - Delete verification codes
   - Delete FCM tokens
   - Anonymize transaction metadata
   - Mark user as deleted
4. **Audit Trail**: Every step logged
5. **Compliance**: Financial data retained per regulations

### Anonymization

User data is anonymized, not completely deleted:

```typescript
await userRepository.update(userId, {
  firstName: null,
  lastName: null,
  email: null,
  phone: `DELETED_${userId.slice(0, 8)}`,
  username: null,
  status: 'deleted',
});
```

## Testing

### Manual Testing

```bash
# Trigger sessions cleanup
curl -X POST http://localhost:3000/data-retention/cleanup/sessions \
  -H "Authorization: Bearer {admin-token}"

# Create test deletion request
curl -X POST http://localhost:3000/data-retention/deletion-requests \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "deletionType": "admin",
    "reason": "Testing",
    "daysDelay": 0
  }'

# View logs
curl http://localhost:3000/data-retention/logs \
  -H "Authorization: Bearer {admin-token}"
```

### Unit Tests

```typescript
describe('DataRetentionService', () => {
  it('should soft delete expired sessions', async () => {
    // Create test sessions
    const session = await createTestSession({
      expiresAt: new Date('2025-01-01'),
    });

    // Run cleanup
    await service.processRetentionPolicy('sessions');

    // Verify soft delete
    const deleted = await sessionRepo.findOne({
      where: { id: session.id },
    });
    expect(deleted.deletedAt).not.toBeNull();
  });

  it('should create deletion request with audit trail', async () => {
    const request = await service.createDeletionRequest(
      'user-id',
      'admin-id',
      'gdpr',
      'User request',
      30,
    );

    expect(request.auditTrail).toHaveLength(1);
    expect(request.auditTrail[0].action).toBe('created');
  });
});
```

## Monitoring

### Metrics to Track

- Records processed per job
- Execution time
- Failure rate
- Storage space reclaimed

### Logs

All retention activities are logged to `data_retention_logs`:

```sql
SELECT
  job_name,
  data_type,
  SUM(records_deleted) as total_deleted,
  COUNT(*) as executions
FROM system.data_retention_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY job_name, data_type;
```

### Alerts

Set up alerts for:
- Job failures
- Unusual deletion volumes
- Long execution times
- Deletion request failures

## Security

1. **Admin-Only Access**: All endpoints require admin authentication
2. **Audit Trails**: Every action logged with timestamp and user
3. **Irreversibility**: Hard deletes cannot be undone
4. **Grace Periods**: Soft deletes provide safety window
5. **Compliance**: Regulatory data retained even after user deletion

## Compliance

### GDPR
- ✅ Article 17: Right to Erasure
- ✅ Article 5: Storage Limitation
- ✅ Audit trails for data processing
- ✅ Automated retention enforcement

### Financial Regulations
- ✅ 7-year retention for transactions
- ✅ KYC document archival
- ✅ Audit log preservation

## Migration

Run the migration to create tables:

```bash
npm run migration:run
```

This creates:
- `system.retention_policies`
- `system.data_deletion_requests`
- `system.data_retention_logs`

And adds `deleted_at` columns to:
- `auth.sessions`
- `auth.verifications`
- `webhook_deadletters`

## Configuration

Retention policies are configurable via API:

```typescript
// Disable a policy
await policyRepo.update('notifications', { isEnabled: false });

// Change retention period
await policyRepo.update('sessions', { retentionDays: 120 });

// Change action
await policyRepo.update('user_data', {
  action: RetentionAction.DELETE, // vs ANONYMIZE
});
```

## Troubleshooting

### Job Not Running

Check if scheduled jobs are enabled:
```typescript
// In app.module.ts
imports: [
  ScheduleModule.forRoot(), // Required for @Cron decorators
]
```

### Deletion Request Stuck

Check request status:
```sql
SELECT * FROM system.data_deletion_requests
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '1 hour';
```

### Grace Period Not Working

Verify soft delete is enabled for data type:
```sql
SELECT deleted_at FROM auth.sessions
WHERE id = '{session-id}';
```

## Future Enhancements

1. **Archive Storage**: S3/GCS integration for long-term archival
2. **Granular Policies**: Per-user or per-country retention
3. **Data Export**: GDPR data portability
4. **Encryption**: Encrypt archived data
5. **User Self-Service**: Allow users to trigger their own deletion

## Related Documentation

- [DATA_RETENTION_POLICY.md](../../../DATA_RETENTION_POLICY.md) - Full retention policy
- [GDPR_COMPLIANCE.md](../../../GDPR_COMPLIANCE.md) - GDPR compliance guide

## Support

For issues or questions:
- **GitHub Issues**: [repo]/issues
- **Email**: engineering@joonapay.com
