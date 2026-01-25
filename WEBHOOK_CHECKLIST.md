# Webhook Reliability Implementation Checklist

## Pre-Deployment Checklist

### Database
- [ ] Run migration: `npm run migration:run`
- [ ] Verify `webhook_deadletters` table exists
- [ ] Check all indexes are created
- [ ] Test database connection

### Configuration
- [ ] Verify `CIRCLE_WEBHOOK_SECRET` is set
- [ ] Verify `YELLOW_CARD_WEBHOOK_SECRET` is set
- [ ] Verify Redis configuration (host, port, password)
- [ ] Test Redis connection

### Security
- [ ] Uncomment `@UseGuards(JwtAuthGuard, AdminGuard)` in webhook-admin.controller.ts
- [ ] Verify JWT authentication is working
- [ ] Verify admin role is properly configured
- [ ] Test protected endpoints require authentication

### Testing
- [ ] Test webhook with valid signature (should return 200)
- [ ] Test webhook with invalid signature (should return 401)
- [ ] Test duplicate webhook (should return "Already processed")
- [ ] Test webhook processing failure (should log to DLQ)
- [ ] Test dead-letter queue statistics endpoint
- [ ] Test pending entries endpoint
- [ ] Test retry functionality
- [ ] Test resolve functionality
- [ ] Test ignore functionality

### Monitoring
- [ ] Set up alert for high pending count (> 10)
- [ ] Set up alert for old pending entries (> 24 hours)
- [ ] Set up alert for high retry failures (retry_count > 5)
- [ ] Set up dashboard for webhook statistics
- [ ] Configure logging aggregation
- [ ] Set up error tracking (Sentry, etc.)

### Documentation
- [ ] Review WEBHOOK_RELIABILITY.md
- [ ] Review WEBHOOK_RELIABILITY_IMPLEMENTATION.md
- [ ] Review QUICK_START.md
- [ ] Update team wiki/knowledge base
- [ ] Train support team on dead-letter queue management

## Deployment Steps

1. **Backup Database**
   ```bash
   pg_dump -h <host> -U <user> -d <database> > backup_before_webhook_migration.sql
   ```

2. **Run Migration**
   ```bash
   npm run migration:run
   ```

3. **Verify Migration**
   ```sql
   SELECT * FROM webhook_deadletters LIMIT 1;
   ```

4. **Deploy Code**
   ```bash
   # Your deployment process
   npm run build
   npm run start:prod
   ```

5. **Verify Endpoints**
   ```bash
   # Test webhook endpoint
   curl -X POST http://your-domain/webhooks/payment/yellow-card \
     -H "x-yc-signature: test" \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'

   # Test admin endpoint (should require auth)
   curl http://your-domain/admin/webhooks/deadletters/stats
   ```

6. **Monitor First Hour**
   - Watch application logs
   - Check Redis connection
   - Monitor dead-letter queue
   - Verify webhooks are being processed

## Post-Deployment Monitoring

### Daily
- [ ] Check dead-letter queue stats
- [ ] Review any new pending entries
- [ ] Check error logs for webhook failures

### Weekly
- [ ] Review retry success rate
- [ ] Analyze common failure patterns
- [ ] Clean up old resolved/ignored entries (optional)

### Monthly
- [ ] Review webhook reliability metrics
- [ ] Update documentation based on learnings
- [ ] Optimize dead-letter queue handling if needed

## Rollback Plan

If issues occur:

1. **Immediate**: Revert to previous deployment
   ```bash
   # Your rollback process
   git checkout <previous-commit>
   npm run build
   npm run start:prod
   ```

2. **Database**: Rollback migration if needed
   ```bash
   npm run migration:revert
   ```

3. **Monitor**: Watch for webhook failures during rollback

## Success Criteria

- [ ] All webhooks processing successfully
- [ ] No 401 errors for valid signatures
- [ ] Duplicate webhooks properly handled
- [ ] Failed webhooks logged to dead-letter queue
- [ ] Admin can view and manage dead-letter queue
- [ ] Retry mechanism working
- [ ] No performance degradation
- [ ] Redis idempotency working

## Support Contacts

- **Development Team**: [Your team contact]
- **DevOps**: [DevOps contact]
- **Database Admin**: [DBA contact]
- **On-Call**: [On-call rotation]

## Known Issues / Limitations

- Dead-letter retry skips signature verification (by design)
- Redis unavailable = idempotency check skipped (fail-safe)
- Admin endpoints not protected until guards are uncommented

## Additional Resources

- Full Documentation: `src/modules/webhook/WEBHOOK_RELIABILITY.md`
- Implementation Summary: `WEBHOOK_RELIABILITY_IMPLEMENTATION.md`
- Quick Start: `src/modules/webhook/QUICK_START.md`
- Migration File: `src/database/migrations/1737900000000-CreateWebhookDeadletterTable.ts`
