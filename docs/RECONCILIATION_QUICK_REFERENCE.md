# Balance Reconciliation - Quick Reference Card

## Quick Commands

### Check System Status
```bash
curl http://localhost:3000/reconciliation/status
```

### Reconcile Single User
```bash
curl -X POST http://localhost:3000/reconciliation/user/{userId}
```

### Trigger Full Reconciliation
```bash
curl -X POST http://localhost:3000/reconciliation/trigger
```

## Severity Levels

| Severity | Amount | Action Required |
|----------|--------|----------------|
| 🔴 **CRITICAL** | >= $1.00 | Immediate investigation + Finance team alert |
| 🟠 **HIGH** | >= $0.10 | Investigate within 24 hours |
| 🟡 **MEDIUM** | >= $0.01 | Review in weekly meeting |
| 🟢 **LOW** | < $0.01 | Monitor only |

## Automated Schedule

| Time | Task | Expected Duration |
|------|------|-------------------|
| 1:00 AM | Full balance reconciliation | 5-10 minutes |
| 2:00 AM | Yellow Card transaction reconciliation | 2-5 minutes |
| 3:00 AM | Circle transaction reconciliation | 2-5 minutes |

## Alert Channels

### Critical Discrepancies (>= $0.10)
- 📧 Email to finance@joonapay.com
- 📱 PagerDuty alert (on-call finance team)
- 💬 Slack #finance-alerts channel
- 📊 In-app notification to admin dashboard

### Daily Summary
- 📧 Email to finance@joonapay.com
- 📊 Dashboard report

## Common Issues

### 1. Race Condition
**Symptom:** Small discrepancy that resolves after retry
**Cause:** Transaction processing in one system but not yet in another
**Solution:** Wait 5 minutes and retry reconciliation

### 2. API Timeout
**Symptom:** Error fetching balance from Circle/Blnk
**Cause:** Network issues or API downtime
**Solution:** Check system status, retry after 1 minute

### 3. Precision Error
**Symptom:** Very small discrepancy (< $0.001)
**Cause:** Floating-point rounding
**Solution:** Usually safe to ignore if < $0.01

### 4. Stuck Transaction
**Symptom:** Large discrepancy after specific transaction
**Cause:** Transaction succeeded in one system but failed in another
**Solution:** Manual investigation required - check transaction logs

## Manual Balance Check

### Check Blnk Balance
```bash
curl http://localhost:5001/balances/user-{userId}-usdc
```

### Check Database Balance
```sql
SELECT balance FROM wallets WHERE user_id = '{userId}';
```

### Check Circle Balance
```bash
curl https://api.circle.com/v1/w3s/wallets/{walletId}/balances \
  -H "Authorization: Bearer {API_KEY}"
```

## Escalation Path

1. **Low/Medium Discrepancy:** Finance analyst reviews
2. **High Discrepancy:** Finance manager investigates
3. **Critical Discrepancy:** Immediate escalation to CTO + CFO
4. **Multiple Critical:** Emergency incident declared

## Contact Information

| Role | Contact | When to Escalate |
|------|---------|------------------|
| Finance Analyst | finance@joonapay.com | Low/Medium discrepancies |
| Finance Manager | finance-manager@joonapay.com | High discrepancies |
| On-Call Engineer | PagerDuty | Critical system failures |
| CTO | cto@joonapay.com | Multiple critical discrepancies |
| CFO | cfo@joonapay.com | Total discrepancy > $1000 |

## Key Metrics Dashboard

Monitor these metrics daily:

1. **Success Rate** - Should be > 99%
2. **Critical Discrepancies** - Should be 0
3. **Total Discrepancy Amount** - Should be < $100/day
4. **Reconciliation Duration** - Should be < 10 minutes
5. **Error Rate** - Should be < 1%

## Emergency Procedures

### If Reconciliation Fails Completely
1. Check Blnk service status
2. Check Circle API status
3. Check database connectivity
4. Review application logs
5. Contact engineering on-call

### If Multiple Critical Discrepancies Found
1. Create incident ticket
2. Alert finance team immediately
3. Suspend affected wallets (if fraud suspected)
4. Document all findings
5. Escalate to CTO/CFO

### If System-Wide Discrepancy
1. STOP all transactions immediately
2. Create critical incident
3. Alert entire finance + engineering team
4. Begin root cause analysis
5. Prepare communication for affected users

## Logs Location

- **Application:** `/var/log/joonapay/reconciliation.log`
- **Errors:** `/var/log/joonapay/error.log`
- **Audit:** `/var/log/joonapay/audit.log`

## Useful Log Patterns

### Find Critical Discrepancies
```bash
grep "CRITICAL BALANCE DISCREPANCY" /var/log/joonapay/reconciliation.log
```

### Daily Summary
```bash
grep "Balance reconciliation completed" /var/log/joonapay/reconciliation.log | tail -1
```

### Recent Errors
```bash
grep "ERROR" /var/log/joonapay/reconciliation.log | tail -20
```

## Testing in Staging

```bash
# Reconcile test user
curl -X POST https://staging.joonapay.com/reconciliation/user/test-user-123

# Trigger full reconciliation (caution: slow)
curl -X POST https://staging.joonapay.com/reconciliation/trigger
```

## Weekly Checklist

- [ ] Review discrepancy trends
- [ ] Check success rate (should be > 99%)
- [ ] Review critical alerts from past week
- [ ] Verify automated reconciliation is running
- [ ] Check system performance metrics
- [ ] Update escalation procedures if needed
- [ ] Train new team members on procedures

## Monthly Review

- [ ] Analyze discrepancy patterns
- [ ] Optimize reconciliation thresholds if needed
- [ ] Review and update alert rules
- [ ] Performance optimization review
- [ ] Document lessons learned
- [ ] Update runbooks based on incidents

---

**Last Updated:** 2024-01-28
**Document Owner:** Finance Operations Team
**Review Frequency:** Monthly
