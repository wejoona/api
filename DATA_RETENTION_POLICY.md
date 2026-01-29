# Data Retention Policy

## Overview

JoonaPay implements a comprehensive data retention policy to comply with GDPR, financial regulations, and security best practices. This document outlines our retention periods, deletion processes, and compliance requirements.

## Retention Periods

### Authentication & Security Data

| Data Type | Retention Period | Action | Grace Period | Compliance Requirement |
|-----------|-----------------|--------|--------------|----------------------|
| Sessions | 90 days | Delete | 0 days | Security best practice |
| Verification Codes | 24 hours | Delete | 0 days | Security requirement |
| Device Metadata | 180 days (inactive) | Anonymize | 30 days | Privacy requirement |

### Transaction & Financial Data

| Data Type | Retention Period | Action | Grace Period | Compliance Requirement |
|-----------|-----------------|--------|--------------|----------------------|
| Transaction Logs | 7 years | Archive | 30 days | Financial regulation (AML/CTF) |
| Audit Logs | 7 years | Archive | 30 days | Compliance requirement |
| KYC Documents | 7 years | Archive | 30 days | AML/KYC regulation |

### Operational Data

| Data Type | Retention Period | Action | Grace Period | Compliance Requirement |
|-----------|-----------------|--------|--------------|----------------------|
| Webhook Logs | 30 days | Archive | 7 days | Operational requirement |
| Notifications | 90 days (read) | Delete | 0 days | Operational cleanup |
| FCM Tokens | 30 days (inactive) | Delete | 0 days | Operational cleanup |

### User Data

| Data Type | Retention Period | Action | Grace Period | Compliance Requirement |
|-----------|-----------------|--------|--------------|----------------------|
| User Profile | Account deletion + 30 days | Anonymize | 30 days | GDPR Article 17 |
| Contact List | Account deletion + 30 days | Delete | 30 days | GDPR compliance |

## Retention Actions

### Delete
Complete removal of data from the system. Used for:
- Non-compliance-critical data
- Temporary data (sessions, verification codes)
- Operational data with no legal retention requirement

**Implementation:** Soft delete followed by hard delete after grace period.

### Anonymize
Removes Personally Identifiable Information (PII) while preserving data for analytics or compliance. Used for:
- User profile data after account deletion
- Transaction metadata
- Device information

**Implementation:**
- Replace PII with anonymized values
- Preserve transaction amounts and timestamps
- Maintain data integrity for audit purposes

### Archive
Moves data to long-term storage with restricted access. Used for:
- Financial transaction records
- KYC documents
- Audit logs

**Implementation:**
- Soft delete in primary database
- Export to secure archive storage (future enhancement)
- Maintain audit trail

## GDPR Compliance

### Right to Erasure (Article 17)

Users can request deletion of their personal data. Our system supports:

1. **User-Initiated Deletion**: Users can request account deletion from the app
2. **Grace Period**: 30-day grace period before permanent deletion
3. **Compliance-Required Retention**: Financial data is anonymized but retained for 7 years

### Data Deletion Process

When a user requests account deletion:

1. **Request Created**: Deletion request is logged with 30-day delay
2. **Notification**: User receives confirmation of deletion request
3. **Cancellation Window**: User can cancel within 30 days
4. **Execution**: After 30 days:
   - User profile data is anonymized
   - Sessions and tokens are deleted
   - Transaction history is anonymized (amounts preserved)
   - KYC documents are archived (regulatory requirement)
   - Contact list is deleted

### Audit Trail

Every deletion request maintains a complete audit trail:
- Request creation timestamp
- User ID and requesting admin (if applicable)
- Each step of the deletion process
- Completion or failure status
- Any errors encountered

## Automated Cleanup Jobs

### Daily Cleanup (2 AM UTC)
Runs retention policy cleanup for all enabled data types:
- Sessions older than 90 days
- Verification codes older than 24 hours
- Read notifications older than 90 days
- Inactive FCM tokens older than 30 days
- Webhook logs older than 30 days

### Hourly Cleanup
- Expired sessions (hard delete after grace period)
- Process pending deletion requests

### Weekly Cleanup (Sunday 2 AM)
- Soft-deleted data past grace period
- Archive eligible financial data

## API Endpoints

### Admin Endpoints

All endpoints require admin authentication.

#### Get Retention Policies
```http
GET /data-retention/policies
```

Response:
```json
{
  "policies": [
    {
      "id": "uuid",
      "dataType": "sessions",
      "retentionDays": 90,
      "action": "delete",
      "gracePeriodDays": 0,
      "isEnabled": true,
      "description": "User sessions older than 90 days",
      "complianceRequirement": "Security best practice"
    }
  ]
}
```

#### Update Retention Policy
```http
PUT /data-retention/policies/:dataType
Content-Type: application/json

{
  "retentionDays": 120,
  "isEnabled": true
}
```

#### Trigger Manual Cleanup
```http
POST /data-retention/cleanup/:dataType
```

Example:
```http
POST /data-retention/cleanup/sessions
```

#### Create Deletion Request (GDPR)
```http
POST /data-retention/deletion-requests
Content-Type: application/json

{
  "userId": "user-uuid",
  "deletionType": "gdpr",
  "reason": "User requested account deletion",
  "daysDelay": 30
}
```

#### Get Deletion Requests
```http
GET /data-retention/deletion-requests?status=pending&limit=50
```

#### View Retention Logs
```http
GET /data-retention/logs?dataType=sessions&limit=100
```

## Database Schema

### retention_policies
Stores retention policies for different data types.

```sql
CREATE TABLE system.retention_policies (
  id UUID PRIMARY KEY,
  data_type VARCHAR(100) UNIQUE NOT NULL,
  retention_days INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'delete', 'anonymize', 'archive'
  grace_period_days INTEGER DEFAULT 30,
  is_enabled BOOLEAN DEFAULT true,
  description TEXT,
  compliance_requirement VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### data_deletion_requests
Tracks GDPR deletion requests.

```sql
CREATE TABLE system.data_deletion_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  requested_by_user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  deletion_type VARCHAR(20) NOT NULL, -- 'gdpr', 'account_closure', 'admin'
  reason TEXT,
  scheduled_for TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  audit_trail JSONB DEFAULT '[]',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### data_retention_logs
Audit log for retention cleanup jobs.

```sql
CREATE TABLE system.data_retention_logs (
  id UUID PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  data_type VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  records_anonymized INTEGER DEFAULT 0,
  records_archived INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Details

### Soft Delete Pattern

Most data types use a soft delete pattern for safety:

1. **First Pass**: Set `deleted_at` timestamp
2. **Grace Period**: Data remains in database but hidden from queries
3. **Hard Delete**: After grace period, permanently remove from database

Example (sessions):
```sql
-- Soft delete
UPDATE auth.sessions
SET deleted_at = NOW()
WHERE expires_at < NOW() - INTERVAL '90 days'
  AND deleted_at IS NULL;

-- Hard delete (after 30-day grace period)
DELETE FROM auth.sessions
WHERE deleted_at < NOW() - INTERVAL '30 days';
```

### Anonymization Pattern

For compliance-required data:

```sql
-- Anonymize user data while preserving transaction integrity
UPDATE auth.users
SET
  first_name = NULL,
  last_name = NULL,
  email = NULL,
  phone = 'DELETED_' || SUBSTRING(id, 1, 8),
  username = NULL
WHERE id = :user_id;

-- Anonymize transaction metadata
UPDATE transactions
SET metadata = NULL
WHERE user_id = :user_id;
```

## Monitoring & Alerts

### Success Metrics
- Number of records processed per cleanup job
- Execution time for each job
- Storage space reclaimed

### Alert Conditions
- Cleanup job fails
- Deletion request fails
- Unusual spike in deletion requests
- Grace period violations

## Testing

### Manual Testing

Trigger cleanup for specific data type:
```bash
curl -X POST http://localhost:3000/data-retention/cleanup/sessions \
  -H "Authorization: Bearer {admin-token}"
```

Create test deletion request:
```bash
curl -X POST http://localhost:3000/data-retention/deletion-requests \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "deletionType": "admin",
    "reason": "Test deletion",
    "daysDelay": 0
  }'
```

### Scheduled Job Testing

Jobs use NestJS `@Cron` decorators:
- Daily cleanup: `0 2 * * *` (2 AM daily)
- Hourly cleanup: `0 * * * *` (every hour)

To test in development, temporarily modify cron expressions or trigger manually.

## Security Considerations

1. **Access Control**: All endpoints require admin authentication
2. **Audit Trail**: Every action is logged with timestamp and user
3. **Irreversibility**: Hard deletes cannot be undone - grace period mitigates accidents
4. **Compliance**: Financial data retained per regulations even after user deletion
5. **Encryption**: Archived data should be encrypted at rest

## Future Enhancements

1. **Archive Storage**: Implement S3/GCS archival for long-term retention
2. **Data Export**: GDPR data portability (Article 20)
3. **Granular Policies**: Per-user or per-country retention policies
4. **Encryption**: Encrypt archived data
5. **Compliance Reports**: Automated compliance reporting
6. **User Dashboard**: Self-service data deletion requests

## References

- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Financial Recordkeeping Requirements](https://www.sec.gov/rules/interp/34-47806.htm)
- [AML/KYC Document Retention](https://www.fatf-gafi.org/recommendations.html)

## Contact

For questions about data retention:
- **Compliance Team**: compliance@joonapay.com
- **Privacy Team**: privacy@joonapay.com
- **Security Team**: security@joonapay.com
