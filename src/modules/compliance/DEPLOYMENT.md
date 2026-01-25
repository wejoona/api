# BCEAO Compliance Engine - Deployment Guide

## Pre-Deployment Checklist

### 1. Database Setup

- [ ] PostgreSQL 14+ installed and configured
- [ ] Database backups enabled (daily snapshots)
- [ ] 7-year retention policy configured
- [ ] Database encryption at rest enabled

**Run migrations:**
```bash
psql -U postgres -d usdc_wallet -f src/modules/compliance/infrastructure/migrations/001_create_compliance_tables.sql
```

**Verify schema:**
```bash
psql -U postgres -d usdc_wallet -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_name LIKE 'compliance%' OR table_name = 'suspicious_activity_reports'
"
```

### 2. Configuration

- [ ] Copy `.env.example` to `.env`
- [ ] Set `BCEAO_COMPLIANCE_ENABLED=true`
- [ ] Configure thresholds based on business requirements
- [ ] Set exchange rates (XOF_TO_USDC_RATE)
- [ ] Configure notification channels
- [ ] Set BCEAO API credentials (when available)

**Required environment variables:**
```bash
BCEAO_COMPLIANCE_ENABLED=true
LARGE_TRANSACTION_THRESHOLD=1000000
XOF_TO_USDC_RATE=600
AUTO_FLAG_VELOCITY_THRESHOLD=5
REPORT_RETENTION_DAYS=2555
```

### 3. Module Integration

- [ ] Add `ComplianceModule` to `app.module.ts`
- [ ] Enable `ScheduleModule.forRoot()` in app module
- [ ] Enable `EventEmitterModule.forRoot()` in app module
- [ ] Import compliance entities in database module

**Example:**
```typescript
import { ComplianceModule } from '@modules/compliance';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ComplianceModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Access Control

- [ ] Create compliance officer role in database
- [ ] Assign compliance officers appropriate permissions
- [ ] Configure role-based access guards
- [ ] Set up admin access for senior officers

**Create roles:**
```sql
-- Add roles to users table
UPDATE users SET role = 'compliance_officer' WHERE email IN (
  'compliance1@joonapay.com',
  'compliance2@joonapay.com'
);

UPDATE users SET role = 'senior_compliance_officer' WHERE email = 'chief-compliance@joonapay.com';
```

### 5. Monitoring & Alerting

- [ ] Configure Prometheus metrics endpoint
- [ ] Set up Grafana dashboard
- [ ] Configure alert notifications (email, SMS, Slack)
- [ ] Set up log aggregation (ELK stack)
- [ ] Configure uptime monitoring

**Prometheus metrics:**
```
compliance_reports_generated_total
compliance_reports_submitted_total
compliance_sars_created_total
compliance_alerts_open_count
compliance_risk_score_avg
```

### 6. External Integrations

- [ ] BCEAO API integration configured (if available)
- [ ] PEP screening provider configured (optional)
- [ ] Sanctions list integration (optional)
- [ ] Exchange rate service integration

### 7. Security Hardening

- [ ] TLS/SSL certificates installed
- [ ] API keys stored in secure vault
- [ ] Database connection encrypted
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured

### 8. Documentation

- [ ] API documentation published
- [ ] Compliance procedures documented
- [ ] Training materials prepared
- [ ] Incident response plan created
- [ ] Contact list updated (BCEAO liaison, etc.)

## Deployment Steps

### Step 1: Staging Deployment

```bash
# 1. Deploy to staging
git checkout main
git pull origin main
npm run build

# 2. Run migrations
NODE_ENV=staging npm run migration:run

# 3. Start staging server
NODE_ENV=staging pm2 start npm --name "joonapay-staging" -- start

# 4. Verify scheduled jobs
pm2 logs joonapay-staging | grep "Scheduled jobs registered"
```

### Step 2: Staging Validation

Test all critical flows:

```bash
# 1. Generate test report
curl -X POST https://staging-api.joonapay.com/api/v1/compliance/reports/generate \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-24T23:59:59.999Z"
  }'

# 2. Create test SAR
curl -X POST https://staging-api.joonapay.com/api/v1/compliance/sars \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "transactionIds": ["test-tx-id"],
    "narrative": "Test SAR",
    "riskScore": 50
  }'

# 3. Verify dashboard loads
curl https://staging-api.joonapay.com/api/v1/compliance/dashboard \
  -H "Authorization: Bearer $STAGING_TOKEN"
```

### Step 3: Production Deployment

**Pre-deployment:**
```bash
# 1. Create database backup
pg_dump -U postgres usdc_wallet > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration in transaction (for rollback capability)
psql -U postgres -d usdc_wallet << EOF
BEGIN;
\i src/modules/compliance/infrastructure/migrations/001_create_compliance_tables.sql
-- Review output
COMMIT;
-- Or ROLLBACK; if issues
EOF
```

**Deployment:**
```bash
# 1. Build production bundle
NODE_ENV=production npm run build

# 2. Deploy to production servers
pm2 deploy production

# 3. Verify deployment
pm2 list
pm2 logs joonapay-production --lines 50

# 4. Health check
curl https://api.joonapay.com/api/v1/health
```

### Step 4: Post-Deployment Validation

```bash
# 1. Verify scheduled jobs started
curl https://api.joonapay.com/api/v1/admin/jobs/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Check compliance health
curl https://api.joonapay.com/api/v1/compliance/dashboard/health \
  -H "Authorization: Bearer $COMPLIANCE_TOKEN"

# 3. Monitor logs for errors
pm2 logs joonapay-production --lines 100 | grep -i "error\|compliance"

# 4. Verify first scheduled report generation
# Wait until 00:00 WAT next day, then check:
curl https://api.joonapay.com/api/v1/compliance/reports?type=daily&limit=1 \
  -H "Authorization: Bearer $COMPLIANCE_TOKEN"
```

## Rollback Plan

If critical issues arise:

### Database Rollback

```bash
# 1. Stop application
pm2 stop joonapay-production

# 2. Rollback migration
psql -U postgres -d usdc_wallet << EOF
BEGIN;
DROP TABLE IF EXISTS compliance_alerts;
DROP TABLE IF EXISTS suspicious_activity_reports;
DROP TABLE IF EXISTS compliance_reports;
DROP FUNCTION IF EXISTS archive_old_compliance_data();
COMMIT;
EOF

# 3. Restore from backup if needed
psql -U postgres -d usdc_wallet < backup_YYYYMMDD_HHMMSS.sql

# 4. Deploy previous version
pm2 deploy production revert 1
```

### Application Rollback

```bash
# Disable compliance without full rollback
# Set in production environment
BCEAO_COMPLIANCE_ENABLED=false

# Restart application
pm2 restart joonapay-production
```

## Post-Deployment Tasks

### Week 1

- [ ] Monitor scheduled job execution
- [ ] Review first daily reports
- [ ] Tune thresholds based on false positive rate
- [ ] Train compliance officers on new system
- [ ] Document any issues encountered

### Week 2

- [ ] Review first weekly report
- [ ] Analyze SAR generation patterns
- [ ] Optimize slow queries (if any)
- [ ] Update documentation based on feedback

### Month 1

- [ ] Review first monthly report
- [ ] Submit test report to BCEAO (if API available)
- [ ] Conduct compliance team retrospective
- [ ] Fine-tune detection algorithms
- [ ] Performance optimization review

## Monitoring Setup

### Prometheus Metrics

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'joonapay-compliance'
    static_configs:
      - targets: ['api.joonapay.com:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Import dashboard from:
```
src/modules/compliance/monitoring/grafana-dashboard.json
```

**Key panels:**
- Reports generated (daily, weekly, monthly)
- SARs created vs submitted
- Open alerts by severity
- Average risk score trend
- Response time histogram

### Alert Rules

```yaml
# AlertManager rules
groups:
  - name: compliance
    interval: 5m
    rules:
      - alert: HighOpenAlerts
        expr: compliance_alerts_open_count > 20
        for: 10m
        annotations:
          summary: "High number of open compliance alerts"

      - alert: UnsubmittedSAR
        expr: compliance_sar_age_hours > 48
        annotations:
          summary: "SAR older than 48 hours not submitted"

      - alert: ReportBacklog
        expr: compliance_reports_pending_count > 5
        for: 24h
        annotations:
          summary: "Compliance report submission backlog"
```

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables for query optimization
ANALYZE compliance_reports;
ANALYZE suspicious_activity_reports;
ANALYZE compliance_alerts;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename LIKE 'compliance%'
ORDER BY idx_scan;

-- Vacuum tables periodically
VACUUM ANALYZE compliance_reports;
VACUUM ANALYZE suspicious_activity_reports;
```

### Application Tuning

```typescript
// Adjust batch sizes based on load
BATCH_ANALYSIS_CHUNK_SIZE=50  // Reduce if CPU/memory constrained

// Increase cache TTL for stable data
RISK_SCORE_CACHE_TTL=600  // 10 minutes

// Tune database connection pool
DATABASE_POOL_SIZE=20
DATABASE_POOL_MAX=50
```

### Caching Strategy

```typescript
// Enable Redis caching for expensive operations
@Cacheable({ ttl: 300 })
async getUserRiskProfile(userId: string) {
  // Expensive calculation cached for 5 minutes
}

// Cache geographic risk data (changes infrequently)
@Cacheable({ ttl: 86400 }) // 24 hours
assessGeographicRisk(countryCode: string) {
  // Risk data cached for 1 day
}
```

## Disaster Recovery

### Backup Strategy

**Daily backups:**
```bash
# Cron job: Daily at 02:00 WAT
0 2 * * * pg_dump -U postgres usdc_wallet | gzip > /backups/usdc_wallet_$(date +\%Y\%m\%d).sql.gz
```

**Compliance data export:**
```bash
# Weekly export to S3
0 3 * * 0 psql -U postgres -d usdc_wallet -c "COPY (
  SELECT * FROM compliance_reports WHERE archived_at IS NULL
) TO STDOUT" | gzip | aws s3 cp - s3://joonapay-compliance-archive/reports_$(date +\%Y\%m\%d).csv.gz
```

### Recovery Testing

Schedule quarterly disaster recovery drills:

```bash
# 1. Simulate database failure
# 2. Restore from backup
# 3. Verify data integrity
# 4. Test compliance functionality
# 5. Document recovery time
```

## Compliance with BCEAO

### Submission Schedule

| Report Type | Deadline | Action |
|-------------|----------|--------|
| Daily | 09:00 WAT next business day | Auto-generated 00:00, submit by 09:00 |
| Weekly | Monday 09:00 WAT | Auto-generated Sunday 00:00 |
| Monthly | 10th of following month | Auto-generated 1st, submit by 10th |
| SAR | Within 48 hours | Submit immediately after investigation |

### Submission Checklist

**Before submitting reports:**
- [ ] Review metrics for accuracy
- [ ] Verify all large transactions included
- [ ] Check cross-border transaction counts
- [ ] Confirm user statistics
- [ ] Add compliance officer notes
- [ ] Approve report

**Before submitting SARs:**
- [ ] Complete investigation
- [ ] Verify all transaction IDs
- [ ] Ensure narrative is comprehensive
- [ ] Confirm risk assessment
- [ ] Obtain senior officer approval
- [ ] Prepare supporting documentation

### BCEAO Contact Information

- **Website**: https://www.bceao.int
- **Reporting Portal**: (URL provided by BCEAO)
- **Emergency Contact**: (Provided during registration)
- **Technical Support**: (Provided during registration)

## Maintenance

### Weekly Maintenance

```bash
# 1. Review database performance
psql -U postgres -d usdc_wallet -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE tablename LIKE 'compliance%'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# 2. Check for slow queries
# Review PostgreSQL slow query log

# 3. Verify scheduled jobs executed
curl https://api.joonapay.com/api/v1/admin/jobs/history?jobName=daily_bceao_report \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Monthly Maintenance

- [ ] Archive old data (>7 years)
- [ ] Review and update risk thresholds
- [ ] Update high-risk country list
- [ ] Review false positive rate
- [ ] Compliance team training session

### Quarterly Maintenance

- [ ] Full system audit
- [ ] Disaster recovery drill
- [ ] Review BCEAO directive updates
- [ ] Update PEP database
- [ ] Refresh sanctions lists
- [ ] Performance optimization review

## Scaling Plan

### Vertical Scaling

**Current**: 4 CPU cores, 8 GB RAM
**Scale to**: 8 CPU cores, 16 GB RAM

When to scale:
- Report generation takes >10 minutes
- API response time >1 second p95
- Database CPU >80% sustained

### Horizontal Scaling

**Add instances:**

```bash
# Deploy additional instances behind load balancer
pm2 start ecosystem.config.js --only compliance-worker-2
pm2 start ecosystem.config.js --only compliance-worker-3
```

**Cron coordination:**

Use Redis locks to prevent duplicate job execution:

```typescript
import { Redis } from 'ioredis';

async generateDailyReport() {
  const lock = await this.redis.set(
    'lock:daily-report',
    'locked',
    'EX', 300, // 5 minutes
    'NX'
  );

  if (!lock) {
    this.logger.log('Another instance is generating report');
    return;
  }

  try {
    await this.doGenerateReport();
  } finally {
    await this.redis.del('lock:daily-report');
  }
}
```

### Database Scaling

**Read replicas:**

```typescript
// Configure read replica for reporting queries
@Module({
  imports: [
    TypeOrmModule.forRoot({
      // ... primary connection
    }),
    TypeOrmModule.forRoot({
      name: 'reporting',
      // ... read replica connection
      replication: {
        master: { ... },
        slaves: [{ ... }],
      },
    }),
  ],
})
```

**Table partitioning:**

```sql
-- Partition compliance_reports by period_start (monthly)
CREATE TABLE compliance_reports_2026_01 PARTITION OF compliance_reports
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE compliance_reports_2026_02 PARTITION OF compliance_reports
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

## Security Hardening

### API Security

```typescript
// Enable rate limiting
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
@Controller('compliance')
export class ComplianceController {}
```

### Database Security

```sql
-- Create read-only user for reporting
CREATE USER compliance_readonly WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO compliance_readonly;

-- Create compliance officer user with limited write access
CREATE USER compliance_officer WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON compliance_reports TO compliance_officer;
GRANT SELECT, INSERT, UPDATE ON suspicious_activity_reports TO compliance_officer;
```

### Audit Logging

```typescript
// Log all compliance actions
@UseInterceptors(AuditLogInterceptor)
@Post('sars/:sarId/submit')
async submitSAR(@Param('sarId') sarId: string) {
  // Audit log automatically created
}
```

## Compliance Team Training

### Training Checklist

- [ ] System overview presentation
- [ ] BCEAO requirements review
- [ ] Hands-on dashboard walkthrough
- [ ] SAR creation practice
- [ ] Alert triage exercise
- [ ] Report approval workflow
- [ ] Emergency procedures
- [ ] Q&A session

### Training Materials

Located in:
- `docs/training/compliance-officer-guide.pdf`
- `docs/training/bceao-requirements.pdf`
- `docs/training/sar-filing-checklist.pdf`

## Go-Live Checklist

### Final Checks

- [ ] All automated tests passing
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] BCEAO notification sent (if required)
- [ ] Compliance team trained
- [ ] Monitoring dashboards live
- [ ] Alert notifications working
- [ ] Backup/restore tested
- [ ] Runbook documented
- [ ] On-call schedule established

### Launch Day

**00:00 WAT** - Deployment window
```bash
# 1. Enable maintenance mode
curl -X POST https://api.joonapay.com/api/v1/admin/maintenance/enable

# 2. Deploy application
pm2 deploy production

# 3. Run migrations
NODE_ENV=production npm run migration:run

# 4. Verify deployment
curl https://api.joonapay.com/api/v1/health

# 5. Disable maintenance mode
curl -X POST https://api.joonapay.com/api/v1/admin/maintenance/disable
```

**00:05 WAT** - Verification
```bash
# Check first scheduled job will run at 00:00 WAT next day
pm2 logs | grep "Scheduled jobs registered"

# Verify all endpoints accessible
curl https://api.joonapay.com/api/v1/compliance/dashboard/health
```

**09:00 WAT** - First day review
- Check if daily report generated successfully
- Review any overnight alerts
- Monitor system performance
- Collect team feedback

## Ongoing Operations

### Daily Operations

**Compliance Officer Routine:**
1. 09:00 - Review overnight alerts
2. 09:30 - Review and approve daily report
3. 10:00 - Submit approved reports to BCEAO
4. 10:30 - Investigate any high-risk patterns
5. 15:00 - Afternoon alert review
6. 17:00 - Update SAR investigations

### Incident Response

**High-risk alert (Critical):**
1. Acknowledge within 15 minutes
2. Begin investigation within 30 minutes
3. Escalate to senior officer if needed
4. Create SAR if warranted
5. Document all actions

**System failure:**
1. Check application logs
2. Verify database connectivity
3. Check scheduled job status
4. Restart services if needed
5. Notify technical team
6. Create incident report

## Support Contacts

### Internal

- **Compliance Officer**: compliance@joonapay.com
- **Senior Compliance Officer**: chief-compliance@joonapay.com
- **Technical Lead**: tech-lead@joonapay.com
- **On-call Engineer**: +225XXXXXXXX

### External

- **BCEAO Reporting**: (Contact from registration)
- **BCEAO Technical**: (Contact from registration)
- **Legal Counsel**: legal@joonapay.com
- **External Auditor**: (Firm contact)

## Success Metrics

Track these KPIs post-deployment:

- **Report Submission Rate**: >95% on time
- **SAR Filing Timeliness**: 100% within 48 hours
- **False Positive Rate**: <15%
- **Alert Response Time**: <2 hours average
- **System Uptime**: >99.9%
- **API Response Time**: <500ms p95

## Continuous Improvement

### Monthly Reviews

Review and optimize:
- Detection thresholds
- False positive patterns
- Processing times
- Team efficiency
- User feedback

### Quarterly Updates

- Update risk models based on new patterns
- Incorporate BCEAO directive changes
- Enhance detection algorithms
- Upgrade dependencies
- Security patches

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Verified By**: _____________
**BCEAO Notification Sent**: [ ] Yes [ ] No
**Sign-off**: _____________
