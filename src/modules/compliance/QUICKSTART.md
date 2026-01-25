# BCEAO Compliance Engine - Quick Start Guide

## Installation

### 1. Enable the Module

Add `ComplianceModule` to your app module:

```typescript
// src/app.module.ts
import { ComplianceModule } from '@modules/compliance';

@Module({
  imports: [
    // ... existing modules
    ComplianceModule,
  ],
})
export class AppModule {}
```

### 2. Run Database Migrations

```bash
# Apply compliance schema
psql -U postgres -d usdc_wallet -f src/modules/compliance/infrastructure/migrations/001_create_compliance_tables.sql

# Verify tables created
psql -U postgres -d usdc_wallet -c "\dt compliance*"
psql -U postgres -d usdc_wallet -c "\dt suspicious_activity_reports"
```

Expected output:
```
                      List of relations
 Schema |            Name                  | Type  |  Owner
--------+----------------------------------+-------+----------
 public | compliance_alerts                | table | postgres
 public | compliance_reports               | table | postgres
 public | suspicious_activity_reports      | table | postgres
```

### 3. Configure Environment Variables

Copy compliance configuration:

```bash
cat src/modules/compliance/.env.example >> .env

# Edit .env and set required values
nano .env
```

Minimum required configuration:
```bash
BCEAO_COMPLIANCE_ENABLED=true
LARGE_TRANSACTION_THRESHOLD=1000000
XOF_TO_USDC_RATE=600
AUTO_FLAG_VELOCITY_THRESHOLD=5
```

### 4. Restart Application

```bash
npm run start:dev
```

Verify compliance module loaded:
```
[Nest] INFO [ComplianceModule] Compliance module initialized
[Nest] INFO [BCEAOReportingService] Scheduled jobs registered
```

## Testing the Installation

### 1. Check API Endpoints

```bash
# Get compliance dashboard
curl http://localhost:3000/api/v1/compliance/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Dashboard JSON response (even if empty initially)

### 2. Trigger Manual Report Generation

```bash
curl -X POST http://localhost:3000/api/v1/compliance/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-24T23:59:59.999Z"
  }'
```

Expected: Report created with status "pending_review"

### 3. Test Transaction Screening

```bash
curl -X POST http://localhost:3000/api/v1/compliance/users/USER_UUID/analyze \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Risk profile analysis result

## Basic Usage

### Screen Transaction Before Execution

```typescript
import { AMLCFTService } from '@modules/compliance';

@Injectable()
export class TransferService {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async createTransfer(userId: string, amount: number, recipientId: string) {
    // 1. Screen transaction
    const assessment = await this.amlCftService.analyzeTransaction(
      userId,
      amount,
      recipientId,
    );

    // 2. Block if not approved
    if (!assessment.approved) {
      throw new ForbiddenException('Transaction blocked due to compliance risk');
    }

    // 3. Flag for review if high risk
    if (assessment.requiresManualReview) {
      // Create pending transaction for manual review
      return this.createPendingTransfer(userId, amount, recipientId, assessment);
    }

    // 4. Execute transaction
    return this.executeTransfer(userId, amount, recipientId);
  }
}
```

### Create Manual SAR

```typescript
import { SARGeneratorService } from '@modules/compliance';

@Injectable()
export class ComplianceOfficerService {
  constructor(private readonly sarGenerator: SARGeneratorService) {}

  async flagSuspiciousUser(
    userId: string,
    transactionIds: string[],
    reason: string,
    officerId: string,
  ) {
    const sar = await this.sarGenerator.createManualSAR(
      userId,
      transactionIds,
      reason,
      officerId,
      75, // Risk score
    );

    console.log(`SAR created: ${sar.id}`);
    return sar;
  }
}
```

### Listen to Compliance Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  @OnEvent('compliance.alert.created')
  async handleAlert(payload: { alertId: string; severity: string }) {
    if (payload.severity === 'critical') {
      await this.sendSMS({
        to: '+225XXXXXXXX',
        message: `CRITICAL compliance alert: ${payload.alertId}`,
      });
    }
  }

  @OnEvent('compliance.sar.submitted')
  async handleSARSubmission(payload: { sarId: string; bceaoReference: string }) {
    await this.sendEmail({
      to: 'compliance@joonapay.com',
      subject: 'SAR Submitted to BCEAO',
      body: `SAR ${payload.sarId} submitted. Reference: ${payload.bceaoReference}`,
    });
  }
}
```

## Common Tasks

### Daily Tasks (Compliance Officer)

**Morning Review (09:00 WAT):**

1. Check overnight alerts:
```bash
GET /compliance/alerts?severity=high
GET /compliance/alerts?severity=critical
```

2. Review daily report:
```bash
GET /compliance/reports?type=daily&limit=1
```

3. Approve and submit:
```bash
PUT /compliance/reports/{reportId}/approve
POST /compliance/reports/{reportId}/submit
```

**Afternoon Review (15:00 WAT):**

1. Check new alerts:
```bash
GET /compliance/dashboard/activity?hours=6
```

2. Review pending SARs:
```bash
GET /compliance/sars?status=under_investigation
```

3. Update investigations:
```bash
PUT /compliance/sars/{sarId}/investigation
```

### Weekly Tasks

**Monday Morning:**

1. Review weekly report:
```bash
GET /compliance/reports?type=weekly&limit=1
```

2. Run batch analysis:
```bash
POST /compliance/analysis/batch?daysBack=7
```

3. Review trends:
```bash
GET /compliance/dashboard?days=7
```

### Monthly Tasks

**First Week of Month:**

1. Generate monthly report:
```bash
POST /compliance/reports/generate
{
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.999Z"
}
```

2. Review and submit to BCEAO:
```bash
PUT /compliance/reports/{reportId}/approve
POST /compliance/reports/{reportId}/submit
```

3. Export for board meeting:
```bash
POST /compliance/export/summary
{
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.999Z"
}
```

## Scheduled Jobs

The module automatically runs these jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily_bceao_report` | Daily 00:00 WAT | Generate daily transaction report |
| `weekly_bceao_report` | Sunday 00:00 WAT | Generate weekly summary |
| `monthly_bceao_report` | 1st 00:00 WAT | Generate monthly compliance report |

### Manual Job Triggering

For testing or re-running:

```typescript
import { BCEAOReportingService } from '@modules/compliance';

// Manually trigger daily report
await bceaoReportingService.generateDailyReport();

// Manually trigger weekly report
await bceaoReportingService.generateWeeklyReport();

// Manually trigger monthly report
await bceaoReportingService.generateMonthlyReport();
```

## Troubleshooting

### Issue: Scheduled jobs not running

**Solution:**
```typescript
// Verify ScheduleModule is imported
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Must be at root level
    ComplianceModule,
  ],
})
```

### Issue: Transaction screening blocking all transactions

**Solution:**
```bash
# Check configuration
echo $BCEAO_COMPLIANCE_ENABLED

# Temporarily disable for testing
BCEAO_COMPLIANCE_ENABLED=false npm run start:dev
```

### Issue: Reports generating with zero transactions

**Solution:**
```typescript
// Verify transaction table has data
const count = await transactionRepository.count();
console.log(`Total transactions: ${count}`);

// Check date range
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
console.log(`Querying for: ${yesterday}`);
```

### Issue: SAR submission failing

**Solution:**
```typescript
// Check SAR status
const sar = await sarRepository.findOne({ where: { id: sarId } });
console.log(`SAR status: ${sar.status}`); // Must be 'under_investigation'

// Check BCEAO API configuration
console.log(process.env.BCEAO_API_URL);
console.log(process.env.BCEAO_API_KEY ? 'API key set' : 'API key missing');
```

### Issue: High false positive rate

**Solution:**
```bash
# Adjust thresholds in .env
AUTO_FLAG_VELOCITY_THRESHOLD=10  # Increase from 5
STRUCTURING_TIME_WINDOW=48      # Increase from 24

# Restart application
npm run start:dev
```

## Performance Optimization

### 1. Enable Caching

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';

async getUserRiskProfile(userId: string) {
  const cacheKey = `risk:${userId}`;
  const cached = await this.cache.get(cacheKey);

  if (cached) return cached;

  const profile = await this.calculateRiskProfile(userId);
  await this.cache.set(cacheKey, profile, 300); // 5 min TTL

  return profile;
}
```

### 2. Database Indexes

Verify indexes are created:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'compliance_reports';
SELECT * FROM pg_indexes WHERE tablename = 'suspicious_activity_reports';
```

### 3. Batch Processing

Process large datasets in chunks:
```typescript
const CHUNK_SIZE = 100;
const users = await this.getUserIds();

for (let i = 0; i < users.length; i += CHUNK_SIZE) {
  const chunk = users.slice(i, i + CHUNK_SIZE);
  await Promise.all(chunk.map(userId => this.analyzeUser(userId)));
}
```

## Security Checklist

- [ ] JWT authentication enabled on all endpoints
- [ ] Role-based access control configured
- [ ] Audit logging enabled
- [ ] Database encryption at rest
- [ ] TLS/SSL enabled for API
- [ ] Environment variables secured (not in git)
- [ ] BCEAO API keys in vault
- [ ] No-tipping-off compliance verified
- [ ] Access logs monitored
- [ ] Data retention policy enforced

## Next Steps

1. **Integrate with transaction flow**
   - Add screening guard to transfer endpoints
   - Implement manual review workflow

2. **Configure notifications**
   - Set up email alerts for compliance officers
   - Configure Slack webhooks for critical alerts

3. **Set up monitoring**
   - Configure Prometheus metrics
   - Set up Grafana dashboards
   - Enable log aggregation

4. **Train compliance team**
   - Conduct system walkthrough
   - Review BCEAO requirements
   - Practice SAR filing workflow

5. **Production readiness**
   - Load testing
   - Disaster recovery testing
   - BCEAO API integration (when available)
   - External audit review

## Support

- **Technical Issues**: Open GitHub issue
- **Compliance Questions**: compliance@joonapay.com
- **BCEAO Integration**: regulatory@joonapay.com

## Resources

- [BCEAO Official Website](https://www.bceao.int)
- [FATF Recommendations](https://www.fatf-gafi.org)
- [Module README](./README.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
