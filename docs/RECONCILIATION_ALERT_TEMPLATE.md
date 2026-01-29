# Reconciliation Alert Email Templates

## 1. Critical Balance Discrepancy Alert

**Subject:** 🚨 CRITICAL: Balance Discrepancy Detected - User {userId}

**Body:**
```
CRITICAL BALANCE DISCREPANCY ALERT
===================================

Alert Time: {timestamp}
Alert ID: {alertId}
Severity: CRITICAL

USER DETAILS
------------
User ID: {userId}
Wallet ID: {walletId}
Currency: {currency}

BALANCE COMPARISON
------------------
Blnk Ledger:    ${blnkBalance} USDC
Database:       ${databaseBalance} USDC
Circle API:     ${circleBalance} USDC

DISCREPANCIES
-------------
Blnk vs DB:     ${blnkDiff} USDC
Circle vs DB:   ${circleDiff} USDC
Max Difference: ${totalDiff} USDC

IMMEDIATE ACTIONS REQUIRED
--------------------------
1. Investigate the cause of discrepancy
2. Review recent transactions for this user
3. Check system logs for errors
4. Determine which balance is correct
5. Create correction transaction if needed

REVIEW TRANSACTIONS
-------------------
Blnk Transactions:
  https://admin.joonapay.com/ledger/transactions?user={userId}

Database Transactions:
  https://admin.joonapay.com/transactions?user={userId}

Circle Transactions:
  https://admin.joonapay.com/circle/transactions?wallet={circleWalletId}

USER ACTIONS
------------
Consider temporarily suspending this wallet until discrepancy is resolved.

ESCALATION
----------
If unable to resolve within 1 hour, escalate to:
- Finance Manager: finance-manager@joonapay.com
- CTO: cto@joonapay.com

---
This is an automated alert from JoonaPay Balance Reconciliation System
For questions, contact: finance@joonapay.com
```

## 2. Daily Reconciliation Summary

**Subject:** Daily Balance Reconciliation Report - {date}

**Body:**
```
DAILY BALANCE RECONCILIATION REPORT
====================================

Report Date: {date}
Reconciliation Time: {timestamp}
Duration: {duration}ms

SUMMARY
-------
Total Wallets Checked:     {totalWallets}
Successfully Reconciled:   {reconciledWallets}
Discrepancies Found:       {discrepancyCount}
Errors Encountered:        {errorCount}
Success Rate:              {successRate}%

DISCREPANCY BREAKDOWN
---------------------
Critical (>= $1.00):       {criticalCount}
High (>= $0.10):           {highCount}
Medium (>= $0.01):         {mediumCount}
Low (< $0.01):             {lowCount}

CRITICAL DISCREPANCIES
----------------------
{criticalDiscrepanciesList}

HIGH PRIORITY DISCREPANCIES
---------------------------
{highDiscrepanciesList}

ACTIONS REQUIRED
----------------
{if criticalCount > 0}
  ⚠️  IMMEDIATE: Investigate {criticalCount} critical discrepancies
{endif}
{if highCount > 0}
  ⚠️  TODAY: Review {highCount} high-priority discrepancies
{endif}
{if mediumCount > 0}
  📋 THIS WEEK: Review {mediumCount} medium-priority discrepancies
{endif}

ERRORS
------
{if errorCount > 0}
  The following errors were encountered during reconciliation:
  {errorsList}
{else}
  No errors encountered during reconciliation.
{endif}

TRENDS (7-DAY AVERAGE)
----------------------
Avg Success Rate:          {avg7DaySuccessRate}%
Avg Critical Count:        {avg7DayCriticalCount}
Avg Total Discrepancy:     ${avg7DayTotalDiscrepancy}

DETAILED REPORT
---------------
Full report available at:
https://admin.joonapay.com/reconciliation/reports/{reportId}

---
This is an automated daily report from JoonaPay Balance Reconciliation System
For questions, contact: finance@joonapay.com
```

## 3. Multiple Critical Discrepancies Alert

**Subject:** 🚨 URGENT: {count} Critical Balance Discrepancies Detected

**Body:**
```
URGENT: MULTIPLE CRITICAL DISCREPANCIES
========================================

Alert Time: {timestamp}
Number of Critical Discrepancies: {count}
Total Discrepancy Amount: ${totalAmount} USDC

SEVERITY: CRITICAL
THIS REQUIRES IMMEDIATE ATTENTION

AFFECTED USERS
--------------
{for each discrepancy}
User ID: {userId}
Wallet ID: {walletId}
Discrepancy: ${totalDiff} USDC
Details: https://admin.joonapay.com/reconciliation/discrepancy/{userId}
{endfor}

IMMEDIATE ACTIONS
-----------------
1. Create incident ticket: INC-{incidentId}
2. Notify engineering team
3. Suspend affected wallets if fraud suspected
4. Begin root cause analysis
5. Prepare customer communication if needed

SYSTEM STATUS
-------------
Check system health:
- Blnk Status: https://status.blnk.io
- Circle Status: https://status.circle.com
- Database Status: https://admin.joonapay.com/system/db-health

ESCALATION PATH
---------------
1. Finance Manager (immediate)
2. CTO (within 30 minutes)
3. CFO (if total discrepancy > $1000)

INCIDENT RESPONSE TEAM
----------------------
Assemble the following team members:
- Finance Lead
- Engineering On-Call
- Product Manager
- Customer Support Lead

COMMUNICATION
-------------
Draft customer communication template:
https://admin.joonapay.com/templates/balance-discrepancy

---
This is a CRITICAL automated alert from JoonaPay Balance Reconciliation System
For immediate assistance, contact: on-call@joonapay.com or PagerDuty
```

## 4. Reconciliation Failure Alert

**Subject:** ⚠️ Balance Reconciliation Failed - System Issue

**Body:**
```
RECONCILIATION SYSTEM FAILURE
==============================

Alert Time: {timestamp}
Error: {errorMessage}

The automated balance reconciliation has failed to complete.
This may indicate a system-wide issue.

ERROR DETAILS
-------------
Service: {source}
Error Type: {errorType}
Error Message: {errorMessage}
Stack Trace: {stackTrace}

IMPACT
------
- Daily reconciliation not completed
- Balance discrepancies may go undetected
- Manual reconciliation required

IMMEDIATE ACTIONS
-----------------
1. Check service status:
   - Blnk: http://localhost:5001/health
   - Circle: https://api.circle.com/health
   - Database: Check connection pool

2. Review application logs:
   tail -f /var/log/joonapay/reconciliation.log

3. Attempt manual reconciliation:
   curl -X POST http://localhost:3000/reconciliation/trigger

4. If issue persists, contact engineering:
   engineering-oncall@joonapay.com

FALLBACK PROCEDURE
------------------
If automated reconciliation cannot be restored:
1. Run manual reconciliation for high-value wallets
2. Increase monitoring frequency
3. Set up manual daily checks

SYSTEM DIAGNOSTICS
------------------
Run the following diagnostics:
```bash
# Check Blnk connection
curl http://localhost:5001/health

# Check database connection
psql -h localhost -U postgres -d joonapay -c "SELECT 1"

# Check Circle API
curl https://api.circle.com/v1/w3s/health
```

ESCALATION
----------
If unable to resolve within 2 hours:
- Escalate to: Engineering Manager
- Contact: engineering-manager@joonapay.com
- PagerDuty: Alert "Balance Reconciliation Down"

---
This is an automated system alert from JoonaPay Balance Reconciliation System
For immediate assistance, contact: on-call@joonapay.com
```

## 5. Weekly Reconciliation Trends Report

**Subject:** Weekly Balance Reconciliation Trends - Week of {weekStart}

**Body:**
```
WEEKLY RECONCILIATION TRENDS REPORT
====================================

Report Period: {weekStart} to {weekEnd}
Generated: {timestamp}

WEEKLY SUMMARY
--------------
Total Reconciliations Run:       {totalRuns}
Total Wallets Checked:           {totalWallets}
Average Success Rate:            {avgSuccessRate}%
Total Discrepancies Found:       {totalDiscrepancies}
Total Critical Discrepancies:    {totalCritical}

DAILY BREAKDOWN
---------------
{for each day}
{date}:
  Wallets: {wallets} | Reconciled: {reconciled} | Success: {successRate}%
  Critical: {critical} | High: {high} | Medium: {medium} | Low: {low}
{endfor}

TREND ANALYSIS
--------------
Success Rate Trend:        {trendDirection} ({trendPercentage}%)
Critical Discrepancy Trend: {criticalTrend}
Total Discrepancy Amount:  ${totalDiscrepancyAmount}

{if trendNegative}
⚠️  WARNING: Success rate is trending down
Action Required: Investigate root causes
{endif}

TOP ISSUES THIS WEEK
--------------------
1. {issue1}: {count1} occurrences
2. {issue2}: {count2} occurrences
3. {issue3}: {count3} occurrences

RESOLVED DISCREPANCIES
----------------------
This week, {resolvedCount} discrepancies were successfully resolved:
{resolvedList}

UNRESOLVED DISCREPANCIES
------------------------
{unresolvedCount} discrepancies remain unresolved:
{unresolvedList}

RECOMMENDATIONS
---------------
{recommendations}

NEXT WEEK FOCUS
---------------
1. {focus1}
2. {focus2}
3. {focus3}

DETAILED ANALYTICS
------------------
View full analytics dashboard:
https://admin.joonapay.com/reconciliation/analytics/weekly/{weekId}

---
This is an automated weekly report from JoonaPay Balance Reconciliation System
For questions, contact: finance@joonapay.com
```

## Template Variables Reference

### Common Variables
- `{timestamp}` - ISO 8601 timestamp
- `{userId}` - User ID
- `{walletId}` - Wallet ID
- `{currency}` - Currency code (e.g., USDC)

### Balance Variables
- `{blnkBalance}` - Balance from Blnk ledger
- `{databaseBalance}` - Balance from database
- `{circleBalance}` - Balance from Circle API
- `{blnkDiff}` - Difference between Blnk and database
- `{circleDiff}` - Difference between Circle and database
- `{totalDiff}` - Maximum difference

### Severity Variables
- `{severity}` - critical | high | medium | low
- `{criticalCount}` - Count of critical discrepancies
- `{highCount}` - Count of high discrepancies
- `{mediumCount}` - Count of medium discrepancies
- `{lowCount}` - Count of low discrepancies

### Report Variables
- `{totalWallets}` - Total wallets checked
- `{reconciledWallets}` - Successfully reconciled wallets
- `{discrepancyCount}` - Number of discrepancies
- `{errorCount}` - Number of errors
- `{successRate}` - Success rate percentage
- `{duration}` - Duration in milliseconds

## Customization

To customize these templates for your notification system:

1. Replace placeholders with actual values
2. Format currency values appropriately
3. Add company branding
4. Include relevant links to your admin dashboard
5. Adjust severity thresholds as needed
6. Localize for different regions/languages

## Integration Examples

### SendGrid
```typescript
await sendgrid.send({
  to: 'finance@joonapay.com',
  from: 'alerts@joonapay.com',
  subject: `🚨 CRITICAL: Balance Discrepancy Detected - User ${userId}`,
  html: renderTemplate('critical-discrepancy', data),
});
```

### Slack
```typescript
await slack.postMessage({
  channel: '#finance-alerts',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Critical Balance Discrepancy',
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*User ID:*\n${userId}` },
        { type: 'mrkdwn', text: `*Discrepancy:*\n$${totalDiff}` },
      ],
    },
  ],
});
```

### PagerDuty
```typescript
await pagerduty.createIncident({
  title: `Critical Balance Discrepancy: ${totalDiff} USDC`,
  service: 'balance-reconciliation',
  severity: 'critical',
  body: renderTemplate('critical-discrepancy', data),
});
```
