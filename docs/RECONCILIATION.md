# Balance Reconciliation System

## Overview

The Balance Reconciliation System ensures that balances across three critical systems remain synchronized:

1. **Blnk Ledger** - Double-entry accounting ledger (source of truth for transactions)
2. **Database** - PostgreSQL wallet table (application state)
3. **Circle API** - External custody provider (actual blockchain balances)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              ReconciliationService                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Blnk Ledger │  │   Database   │  │  Circle API  │     │
│  │   Provider   │  │  Repository  │  │   Provider   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                     Compare Balances                        │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         ▼                  ▼                  ▼            │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐        │
│   │ Matched │       │ Low Diff│       │Critical │        │
│   └─────────┘       └────┬────┘       └────┬────┘        │
│                           │                 │             │
│                           ▼                 ▼             │
│                      ┌────────────────────────┐           │
│                      │   Alert System         │           │
│                      └────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. User-Level Reconciliation

Compare balances for a single user:

```typescript
const report = await reconciliationService.reconcileUserBalance(userId);
```

**Response:**
```json
{
  "userId": "user-123",
  "walletId": "wallet-456",
  "currency": "USDC",
  "blnkBalance": "100.500000",
  "databaseBalance": "100.000000",
  "circleBalance": "100.000000",
  "isReconciled": false,
  "discrepancy": {
    "blnkDiff": "0.500000",
    "circleDiff": "0.000000",
    "totalDiff": "0.500000",
    "severity": "medium"
  },
  "timestamp": "2024-01-28T12:00:00Z"
}
```

### 2. System-Wide Reconciliation

Reconcile all active wallets:

```typescript
const report = await reconciliationService.reconcileAllBalances();
```

**Response:**
```json
{
  "totalWallets": 100,
  "reconciledWallets": 95,
  "discrepancies": [
    {
      "userId": "user-123",
      "walletId": "wallet-456",
      "totalDiff": "1.500000",
      "severity": "critical"
    }
  ],
  "errors": [],
  "timestamp": "2024-01-28T12:00:00Z",
  "duration": 5432
}
```

### 3. Automated Daily Reconciliation

Runs automatically every day at 1 AM:

```typescript
@Cron(CronExpression.EVERY_DAY_AT_1AM)
async reconcileAllBalances(): Promise<FullReconciliationReport>
```

### 4. Severity-Based Alerting

Discrepancies are categorized by severity:

| Severity | Threshold | Action |
|----------|-----------|--------|
| **Critical** | >= $1.00 | Immediate alert to finance team + operations |
| **High** | >= $0.10 | Alert to finance team |
| **Medium** | >= $0.01 | Logged for review |
| **Low** | < $0.01 | Logged only |

## API Endpoints

### Get Reconciliation Status
```http
GET /reconciliation/status
```

Returns the initialization status of the reconciliation service.

**Response:**
```json
{
  "yellowCardRuleId": "rule-123",
  "circleRuleId": "rule-456",
  "initialized": true
}
```

### Reconcile Single User
```http
POST /reconciliation/user/:userId
```

**Example:**
```bash
curl -X POST http://localhost:3000/reconciliation/user/user-123 \
  -H "Authorization: Bearer <token>"
```

### Reconcile All Users
```http
POST /reconciliation/all
```

**Example:**
```bash
curl -X POST http://localhost:3000/reconciliation/all \
  -H "Authorization: Bearer <token>"
```

### Trigger On-Demand Reconciliation
```http
POST /reconciliation/trigger
```

Same as `/reconciliation/all`, but with a more explicit name for manual triggering.

## Events

The reconciliation system emits several events for monitoring and alerting:

### 1. `reconciliation.balance.discrepancy`

Emitted when any discrepancy is detected.

```typescript
{
  discrepancy: BalanceDiscrepancy,
  userId: string,
  walletId: string
}
```

### 2. `reconciliation.balance.critical`

Emitted for high-severity discrepancies (>= $0.10).

```typescript
{
  discrepancy: BalanceDiscrepancy,
  userId: string,
  walletId: string
}
```

### 3. `reconciliation.balance.completed`

Emitted when daily reconciliation completes.

```typescript
{
  totalWallets: number,
  reconciledWallets: number,
  discrepancies: BalanceDiscrepancy[],
  errors: Array<{ userId, walletId, error }>,
  duration: number
}
```

### 4. `reconciliation.balance.critical.summary`

Emitted when multiple wallets have critical discrepancies.

```typescript
{
  count: number,
  discrepancies: BalanceDiscrepancy[],
  timestamp: Date
}
```

## Integration with Alert System

The `ReconciliationAlertListener` listens to reconciliation events and:

1. **Logs all discrepancies** to audit trail
2. **Sends critical alerts** to operations team
3. **Creates incident reports** for severe cases
4. **Sends daily summary** to finance team

### Example Integration

```typescript
@OnEvent('reconciliation.balance.critical')
async handleCriticalDiscrepancy(event) {
  // Send to PagerDuty
  await this.pagerDutyService.createIncident({
    severity: 'critical',
    title: `Balance Discrepancy: ${event.discrepancy.totalDiff}`,
    service: 'balance-reconciliation',
  });

  // Send to Slack
  await this.slackService.send({
    channel: '#finance-alerts',
    message: `🚨 Critical balance discrepancy detected`,
    details: event.discrepancy,
  });

  // Email finance team
  await this.emailService.send({
    to: 'finance@joonapay.com',
    subject: 'CRITICAL: Balance Discrepancy Alert',
    template: 'critical-discrepancy',
    data: event,
  });
}
```

## Balance Calculation

### Blnk Ledger
- Fetched via `ledgerProvider.getUserBalance(userId, currency)`
- Returns balance in micro-units (1 USDC = 1,000,000 micro-units)
- Source: Blnk's double-entry ledger

### Database
- Fetched via `walletRepository.findByUserId(userId)`
- Stored as floating-point number (e.g., 100.50)
- Converted to micro-units: `BigInt(Math.round(wallet.balance * 1_000_000))`

### Circle API
- Fetched via `walletProvider.getBalance(circleWalletId)`
- Returns as string (e.g., "100.500000")
- Converted to micro-units: `BigInt(Math.round(parseFloat(balance) * 1_000_000))`

### Comparison Logic

```typescript
// Calculate differences
const blnkDiff = blnkBalance - databaseBalance;
const circleDiff = circleBalance - databaseBalance;

// Find maximum absolute difference
const totalDiff = max(
  abs(blnkDiff),
  abs(circleDiff),
  abs(blnkBalance - circleBalance)
);

// Determine severity
if (totalDiff >= 1_000_000) severity = 'critical';  // >= $1.00
else if (totalDiff >= 100_000) severity = 'high';   // >= $0.10
else if (totalDiff >= 10_000) severity = 'medium';  // >= $0.01
else severity = 'low';                               // < $0.01
```

## Monitoring

### Metrics to Track

1. **Reconciliation Success Rate**
   - `reconciledWallets / totalWallets * 100`
   - Target: > 99%

2. **Critical Discrepancies**
   - Count of wallets with discrepancies >= $1
   - Target: 0

3. **Total Discrepancy Amount**
   - Sum of all discrepancies
   - Target: < $100 per day

4. **Reconciliation Duration**
   - Time to complete full reconciliation
   - Target: < 5 minutes for 10,000 wallets

5. **Error Rate**
   - Count of errors during reconciliation
   - Target: < 1%

### Sample Logs

```
[ReconciliationService] Starting full balance reconciliation...
[ReconciliationService] Reconciling 10,000 active wallets...
[ReconciliationService] Reconciliation for user user-123 completed in 45ms - RECONCILED
[ReconciliationService] WARN: Balance discrepancy detected for user user-456: Diff=0.500000 [MEDIUM]
[ReconciliationService] ERROR: CRITICAL BALANCE DISCREPANCY for user user-789: Total difference: 2.500000 USDC
[ReconciliationService] Balance reconciliation completed in 4521ms: 9995/10000 reconciled, 5 discrepancies, 0 errors
[ReconciliationService] WARN: CRITICAL: 2 wallets have discrepancies >= $1
```

## Troubleshooting

### Common Discrepancy Causes

1. **Race Conditions**
   - Transaction processed in one system but not yet in another
   - **Solution:** Retry reconciliation after 1 minute

2. **Precision Errors**
   - Floating-point arithmetic errors
   - **Solution:** Use BigInt for all balance calculations

3. **Failed Transactions**
   - Transaction succeeded in Circle but failed in Blnk
   - **Solution:** Manual investigation and correction

4. **Pending Deposits**
   - Deposit visible in Circle but not yet confirmed in Blnk
   - **Solution:** Wait for transaction confirmation

5. **API Failures**
   - Circle API timeout or error
   - **Solution:** Retry with exponential backoff

### Manual Reconciliation

If automated reconciliation fails:

1. Check individual balances:
   ```bash
   # Blnk
   curl http://localhost:5001/balances/user-user-123-usdc

   # Database
   SELECT balance FROM wallets WHERE user_id = 'user-123';

   # Circle
   curl https://api.circle.com/v1/w3s/wallets/{walletId}/balances
   ```

2. Identify the discrepancy source
3. Correct the issue manually
4. Re-run reconciliation for that user

### Correcting Discrepancies

```typescript
// If Blnk is out of sync
await ledgerProvider.recordAdjustment({
  userId: 'user-123',
  amount: discrepancyAmount,
  reference: 'MANUAL-ADJUSTMENT-001',
  reason: 'Reconciliation correction',
});

// If database is out of sync
await walletRepository.updateBalance('wallet-123', correctBalance);

// Circle cannot be manually adjusted - contact Circle support
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Process wallets in parallel (use Promise.all with batching)
   - Limit concurrent API calls to avoid rate limits

2. **Caching**
   - Cache Circle balances for 1 minute
   - Cache database balances for reconciliation run

3. **Selective Reconciliation**
   - Only reconcile wallets with recent activity
   - Skip wallets with zero balances

4. **Incremental Reconciliation**
   - Run full reconciliation daily
   - Run partial reconciliation hourly for active wallets

### Example: Parallel Processing

```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
  const batch = wallets.slice(i, i + BATCH_SIZE);
  const reports = await Promise.all(
    batch.map(w => this.reconcileUserBalance(w.userId))
  );
  // Process reports...
}
```

## Security

### Access Control

- Reconciliation endpoints require **admin** or **finance** role
- API requires authentication via JWT
- Results contain sensitive financial data

### Audit Trail

All reconciliation operations are logged:
- Timestamp
- User/wallet affected
- Balances compared
- Discrepancies found
- Actions taken

### Data Privacy

- Balance information is encrypted at rest
- API responses do not expose internal IDs
- Audit logs are retained for 7 years (compliance)

## Testing

### Unit Tests

```typescript
describe('ReconciliationService', () => {
  it('should detect discrepancies', async () => {
    // Mock balances
    mockLedger.getUserBalance.mockResolvedValue({ balance: 100_500_000n });
    mockWallet.findByUserId.mockResolvedValue({ balance: 100.0 });
    mockCircle.getBalance.mockResolvedValue([{ available: "100.000000" }]);

    const report = await service.reconcileUserBalance('user-123');

    expect(report.isReconciled).toBe(false);
    expect(report.discrepancy.severity).toBe('medium');
  });
});
```

### Integration Tests

```typescript
it('should reconcile all wallets', async () => {
  const report = await service.reconcileAllBalances();

  expect(report.totalWallets).toBeGreaterThan(0);
  expect(report.reconciledWallets + report.discrepancies.length)
    .toBe(report.totalWallets);
});
```

## Future Enhancements

1. **Auto-Correction**
   - Automatically fix discrepancies below threshold
   - Requires multi-signature approval for large corrections

2. **Machine Learning**
   - Predict discrepancies before they occur
   - Identify patterns in reconciliation failures

3. **Real-Time Reconciliation**
   - Reconcile on every transaction
   - Immediate discrepancy detection

4. **Multi-Currency Support**
   - Support XOF, EUR, other stablecoins
   - Currency-specific thresholds

5. **Advanced Reporting**
   - Historical trend analysis
   - Discrepancy root cause analysis
   - Predictive alerts

## Support

For issues or questions:
- Email: finance@joonapay.com
- Slack: #finance-operations
- On-call: PagerDuty escalation policy "Finance"
