# Database Query Optimization Report

**Generated:** 2026-01-30
**Backend:** NestJS + TypeORM + PostgreSQL
**Scope:** Full analysis of all repository files and ORM entities

---

## Executive Summary

This report identifies performance bottlenecks, N+1 query patterns, missing indexes, and slow query patterns across the JoonaPay USDC Wallet backend. The analysis covers 30+ repository files and their corresponding ORM entities.

### Key Findings

| Category | Issues Found | Severity |
|----------|-------------|----------|
| N+1 Query Patterns | 4 | High |
| Missing Composite Indexes | 12 | Medium-High |
| Missing Single-Column Indexes | 8 | Medium |
| Inefficient Query Patterns | 6 | Medium |
| Unoptimized Aggregations | 3 | Medium |

---

## 1. N+1 Query Patterns

### 1.1 Compliance Dashboard - Risk Trends Calculation

**File:** `/src/modules/compliance/application/services/compliance-dashboard.service.ts`
**Lines:** 186-246

**Problem:** The `calculateRiskTrends` method executes queries inside a loop, causing N+1 queries where N = number of days.

```typescript
// PROBLEMATIC CODE
while (currentDate <= endDate) {
  const alerts = await this.alertRepository.find({
    where: { createdAt: Between(dayStart, dayEnd) },
  });
  const sars = await this.sarRepository.find({
    where: { createdAt: Between(dayStart, dayEnd) },
  });
  currentDate.setDate(currentDate.getDate() + 1);
}
```

**Impact:** For a 30-day dashboard, this executes 60 queries instead of 2.

**Recommended Fix:**
```sql
-- Single query for alerts grouped by date
SELECT
  DATE(created_at) as date,
  COUNT(*) as alert_count,
  AVG((metadata->>'riskScore')::numeric) as avg_risk_score
FROM compliance.alerts
WHERE created_at BETWEEN $1 AND $2
GROUP BY DATE(created_at)
ORDER BY date;

-- Single query for SARs grouped by date
SELECT
  DATE(created_at) as date,
  COUNT(*) as sar_count,
  AVG(risk_score) as avg_risk_score
FROM compliance.suspicious_activity_reports
WHERE created_at BETWEEN $1 AND $2
GROUP BY DATE(created_at)
ORDER BY date;
```

**TypeORM Implementation:**
```typescript
async calculateRiskTrends(startDate: Date, endDate: Date) {
  const [alertTrends, sarTrends] = await Promise.all([
    this.alertRepository
      .createQueryBuilder('alert')
      .select('DATE(alert.createdAt)', 'date')
      .addSelect('COUNT(*)', 'alertCount')
      .addSelect("AVG((alert.metadata->>'riskScore')::numeric)", 'avgRiskScore')
      .where('alert.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(alert.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany(),

    this.sarRepository
      .createQueryBuilder('sar')
      .select('DATE(sar.createdAt)', 'date')
      .addSelect('COUNT(*)', 'sarCount')
      .addSelect('AVG(sar.riskScore)', 'avgRiskScore')
      .where('sar.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(sar.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany(),
  ]);

  // Merge results in application code
  return this.mergeRiskTrends(alertTrends, sarTrends, startDate, endDate);
}
```

---

### 1.2 Admin Service - User Stats Multiple Count Queries

**File:** `/src/modules/admin/application/services/admin.service.ts`
**Lines:** 410-438

**Problem:** Five separate COUNT queries for user statistics.

```typescript
// CURRENT: 5 separate queries
const [totalUsers, activeUsers, suspendedUsers, kycPendingUsers, kycApprovedUsers] =
  await Promise.all([
    this.userRepository.count(),
    this.userRepository.count({ where: { status: 'active' } }),
    this.userRepository.count({ where: { status: 'suspended' } }),
    this.userRepository.count({ where: { kycStatus: 'pending' } }),
    this.userRepository.count({ where: { kycStatus: 'approved' } }),
  ]);
```

**Recommended Fix:** Single query with conditional aggregation
```sql
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
  COUNT(*) FILTER (WHERE kyc_status = 'pending') as kyc_pending_users,
  COUNT(*) FILTER (WHERE kyc_status = 'approved') as kyc_approved_users
FROM auth.users;
```

**TypeORM Implementation:**
```typescript
async getUserStats() {
  const result = await this.userRepository
    .createQueryBuilder('user')
    .select('COUNT(*)', 'totalUsers')
    .addSelect("COUNT(*) FILTER (WHERE user.status = 'active')", 'activeUsers')
    .addSelect("COUNT(*) FILTER (WHERE user.status = 'suspended')", 'suspendedUsers')
    .addSelect("COUNT(*) FILTER (WHERE user.kycStatus = 'pending')", 'kycPendingUsers')
    .addSelect("COUNT(*) FILTER (WHERE user.kycStatus = 'approved')", 'kycApprovedUsers')
    .getRawOne();

  return {
    totalUsers: parseInt(result.totalUsers, 10),
    activeUsers: parseInt(result.activeUsers, 10),
    suspendedUsers: parseInt(result.suspendedUsers, 10),
    kycPendingUsers: parseInt(result.kycPendingUsers, 10),
    kycApprovedUsers: parseInt(result.kycApprovedUsers, 10),
  };
}
```

---

### 1.3 Transaction Search Service - Stats Queries

**File:** `/src/modules/transaction/application/domain/services/transaction-search.service.ts`
**Lines:** 176-206

**Problem:** Four separate search API calls for user statistics.

```typescript
// CURRENT: 4 separate API calls
const [total, deposits, withdrawals, transfers] = await Promise.all([
  this.searchTransactions(baseInput),
  this.searchTransactions({ ...baseInput, type: 'deposit' }),
  this.searchTransactions({ ...baseInput, type: 'withdrawal' }),
  this.searchTransactions({ ...baseInput, type: 'transfer_p2p' }),
]);
```

**Recommended Fix:** Use aggregation query with GROUP BY
```sql
SELECT
  type,
  COUNT(*) as count
FROM transactions
WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)
  AND created_at BETWEEN $2 AND $3
GROUP BY type;
```

---

### 1.4 Wallet Repository - Provider Wallet Lookup

**File:** `/src/modules/wallet/infrastructure/repositories/wallet.repository.ts`
**Lines:** 68-77

**Problem:** Sequential queries for Circle and Yellow Card wallet lookups.

```typescript
// CURRENT: Up to 2 queries
async findByProviderWalletId(providerWalletId: string) {
  const circleWallet = await this.findByCircleWalletId(providerWalletId);
  if (circleWallet) return circleWallet;
  return this.findByYellowCardWalletId(providerWalletId);
}
```

**Recommended Fix:** Single OR query
```typescript
async findByProviderWalletId(providerWalletId: string) {
  const ormEntity = await this.repository.findOne({
    where: [
      { circleWalletId: providerWalletId },
      { yellowCardWalletId: providerWalletId },
    ],
  });
  return ormEntity ? this.mapper.toDomainEntity(ormEntity) : null;
}
```

---

## 2. Missing Composite Indexes

### 2.1 Transactions Table

**Current Indexes:**
- `wallet_id` (single)
- `status` (single)
- `yellow_card_ref` (single)

**Missing Composite Indexes:**

```sql
-- High-frequency query: findByWalletIdFiltered with date range
CREATE INDEX CONCURRENTLY idx_transactions_wallet_date_status
ON transactions (wallet_id, created_at DESC, status);

-- Daily volume calculation query
CREATE INDEX CONCURRENTLY idx_transactions_wallet_type_status_date
ON transactions (wallet_id, type, status, created_at DESC)
WHERE status IN ('completed', 'pending', 'processing');

-- Admin analytics: time-series by date
CREATE INDEX CONCURRENTLY idx_transactions_date_status
ON transactions (DATE(created_at), status);
```

---

### 2.2 Transfers Table

**Current Indexes:**
- `reference` (single)
- `type` (single)
- `status` (single)
- `sender_id` (single)
- `sender_wallet_id` (single)
- `recipient_id` (single)
- `recipient_phone` (single)
- `provider_transfer_id` (single)

**Missing Composite Indexes:**

```sql
-- Query: findByUserId (sender OR recipient)
CREATE INDEX CONCURRENTLY idx_transfers_sender_created
ON transfers (sender_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_transfers_recipient_created
ON transfers (recipient_id, created_at DESC);

-- Combined status filtering
CREATE INDEX CONCURRENTLY idx_transfers_status_created
ON transfers (status, created_at DESC);
```

---

### 2.3 Notifications Table

**Current Indexes:**
- `user_id` (single)
- `type` (single)
- `reference_id` (single)

**Missing Composite Indexes:**

```sql
-- Unread notifications query
CREATE INDEX CONCURRENTLY idx_notifications_user_unread
ON notifications (user_id, created_at DESC)
WHERE read_at IS NULL;

-- User notifications with pagination
CREATE INDEX CONCURRENTLY idx_notifications_user_date
ON notifications (user_id, created_at DESC);
```

---

### 2.4 Contacts Table

**Current Indexes:**
- `user_id` (single)
- `contact_user_id` (single)
- `phone` (single)
- `wallet_address` (single)
- `is_favorite` (single)

**Missing Composite Indexes:**

```sql
-- Contact search and sorting
CREATE INDEX CONCURRENTLY idx_contacts_user_favorite_txcount
ON contacts (user_id, is_favorite DESC, transaction_count DESC);

-- Recent contacts query
CREATE INDEX CONCURRENTLY idx_contacts_user_last_transaction
ON contacts (user_id, last_transaction_at DESC NULLS LAST);
```

---

### 2.5 Sessions Table

**Current Indexes:**
- `user_id` (single)
- `refresh_token_hash` (single)
- `expires_at` (single)

**Missing Composite Indexes:**

```sql
-- Active sessions by user
CREATE INDEX CONCURRENTLY idx_sessions_user_active
ON sessions (user_id, last_activity_at DESC)
WHERE is_active = true;

-- Expired session cleanup
CREATE INDEX CONCURRENTLY idx_sessions_active_expires
ON sessions (expires_at)
WHERE is_active = true;
```

---

### 2.6 Compliance Cases Table

**Current Indexes:**
- `case_number` (single)
- `case_type` (single)
- `subject_user_id` (single)
- `status` (single)
- `priority` (single)
- `assigned_to` (single)

**Missing Composite Indexes:**

```sql
-- Case search with multiple filters
CREATE INDEX CONCURRENTLY idx_compliance_cases_status_priority_date
ON compliance.cases (status, priority, created_at DESC);

-- Agent workload query
CREATE INDEX CONCURRENTLY idx_compliance_cases_assigned_status
ON compliance.cases (assigned_to, status)
WHERE status NOT IN ('CLOSED');
```

---

### 2.7 Support Tickets Table

**Current Indexes:**
- `user_id` (single)
- `status` (single)
- `assigned_to` (single)

**Missing Composite Indexes:**

```sql
-- Active tickets by user
CREATE INDEX CONCURRENTLY idx_support_tickets_user_status
ON system.support_tickets (user_id, status, created_at DESC);

-- Agent queue
CREATE INDEX CONCURRENTLY idx_support_tickets_assigned_priority
ON system.support_tickets (assigned_to, priority DESC, created_at ASC)
WHERE status NOT IN ('resolved', 'closed');
```

---

### 2.8 Devices Table

**Current Indexes:**
- `user_id` (single)
- `fcm_token` (single)
- Unique constraint on `(user_id, device_identifier)`

**Missing Composite Indexes:**

```sql
-- Active devices query
CREATE INDEX CONCURRENTLY idx_devices_user_active
ON auth.devices (user_id, last_login_at DESC)
WHERE is_active = true;
```

---

### 2.9 Referrals Table

**Current Indexes:**
- `referrer_id` (single)
- `referred_id` (single)
- `referral_code` (unique single)

**Missing Composite Indexes:**

```sql
-- Pending referrals by code with expiry check
CREATE INDEX CONCURRENTLY idx_referrals_code_status_expires
ON referrals (referral_code, status, expires_at)
WHERE status = 'pending';

-- Completed referrals awaiting reward
CREATE INDEX CONCURRENTLY idx_referrals_status_completed
ON referrals (status, completed_at ASC)
WHERE status = 'completed';
```

---

### 2.10 KYC Verifications Table

**Current Indexes:**
- `user_id` (unique single)
- `status` (single)

**Missing Composite Indexes:**

```sql
-- Manual review queue
CREATE INDEX CONCURRENTLY idx_kyc_manual_review_queue
ON kyc_verifications (status, submitted_at ASC)
WHERE status = 'manual_review';
```

---

### 2.11 Beneficiaries Table

**Current Indexes:**
- `wallet_id` (single)
- `phone_e164` (single)
- `beneficiary_user_id` (single)
- Unique constraint on `(wallet_id, phone_e164)`

**Missing Composite Indexes:**

```sql
-- Beneficiary list with sorting
CREATE INDEX CONCURRENTLY idx_beneficiaries_wallet_favorite_last
ON wallet.beneficiaries (wallet_id, is_favorite DESC, last_transfer_at DESC NULLS LAST);

-- By account type
CREATE INDEX CONCURRENTLY idx_beneficiaries_wallet_type
ON wallet.beneficiaries (wallet_id, account_type, last_transfer_at DESC NULLS LAST);
```

---

### 2.12 Savings Pots Table

**Current Indexes:**
- `wallet_id` (single)

**Missing Composite Indexes:**

```sql
-- Active pots by wallet
CREATE INDEX CONCURRENTLY idx_savings_pots_wallet_status
ON wallet.savings_pots (wallet_id, status, created_at DESC);

-- Auto-deposit jobs
CREATE INDEX CONCURRENTLY idx_savings_pots_auto_deposit
ON wallet.savings_pots (status, auto_deposit_frequency)
WHERE status = 'active' AND auto_deposit_frequency IS NOT NULL;
```

---

## 3. Slow Query Patterns

### 3.1 ILIKE Text Search Without Full-Text Index

**Files:**
- `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts` (line 236-239)
- `/src/modules/user/infrastructure/repositories/user.repository.ts` (line 86-92)
- `/src/modules/contacts/infrastructure/repositories/contact.repository.ts` (line 86-96)
- `/src/modules/admin/application/services/admin.service.ts` (line 151-154)

**Problem:** `ILIKE '%pattern%'` cannot use B-tree indexes effectively.

**Current Code:**
```typescript
query.andWhere(
  '(tx.yellowCardRef ILIKE :search OR tx.recipientPhone ILIKE :search)',
  { search: `%${escapedSearch}%` }
);
```

**Recommended Fix:** Create GIN trigram indexes

```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Transactions text search
CREATE INDEX CONCURRENTLY idx_transactions_ref_trgm
ON transactions USING gin (yellow_card_ref gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_transactions_phone_trgm
ON transactions USING gin (recipient_phone gin_trgm_ops);

-- Users text search
CREATE INDEX CONCURRENTLY idx_users_username_trgm
ON auth.users USING gin (username gin_trgm_ops);

-- Contacts text search
CREATE INDEX CONCURRENTLY idx_contacts_name_trgm
ON contacts USING gin (name gin_trgm_ops);
```

---

### 3.2 findAll Without Pagination

**Files:**
- `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts` (lines 78-88)
- `/src/modules/wallet/infrastructure/repositories/wallet.repository.ts` (lines 79-87)
- `/src/modules/user/infrastructure/repositories/user.repository.ts` (lines 96-101)

**Problem:** These methods load all records without limit.

```typescript
async findAll(): Promise<TransactionEntity[]> {
  const ormEntities = await this.repository.find({
    order: { createdAt: 'DESC' },
  });
  return ormEntities.map(orm => this.mapper.toDomainEntity(orm));
}
```

**Recommended Fix:** Add mandatory pagination

```typescript
async findAll(options: { limit?: number; offset?: number } = {}): Promise<{
  items: TransactionEntity[];
  total: number;
}> {
  const limit = Math.min(options.limit || 50, 1000);
  const offset = options.offset || 0;

  const [ormEntities, total] = await this.repository.findAndCount({
    order: { createdAt: 'DESC' },
    take: limit,
    skip: offset,
  });

  return {
    items: ormEntities.map(orm => this.mapper.toDomainEntity(orm)),
    total,
  };
}
```

---

### 3.3 Unbounded findByWalletId Queries

**Files:**
- `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts` (lines 39-47)
- `/src/modules/savings-pots/infrastructure/repositories/savings-pot.repository.ts` (lines 33-38)
- `/src/modules/beneficiary/infrastructure/repositories/beneficiary.repository.ts` (lines 30-35)

**Problem:** Loading all user transactions/beneficiaries can be expensive for power users.

**Recommended Fix:** Add default limits and document pagination requirements

```typescript
async findByWalletId(
  walletId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<TransactionEntity[]> {
  const limit = Math.min(options.limit || 100, 500);

  const ormEntities = await this.repository.find({
    where: { walletId },
    order: { createdAt: 'DESC' },
    take: limit,
    skip: options.offset || 0,
  });

  return ormEntities.map(orm => this.mapper.toDomainEntity(orm));
}
```

---

### 3.4 ABS() Function Preventing Index Usage

**File:** `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts`

**Problem:** Using `ABS(amount)` in WHERE/ORDER BY prevents index usage.

```typescript
// Lines 223-226
if (filters.minAmount !== undefined) {
  query.andWhere('ABS(tx.amount) >= :minAmount', { minAmount: filters.minAmount });
}
```

**Recommended Fix:** Store absolute amount in a computed column or filter on signed amount

```sql
-- Option 1: Add computed column
ALTER TABLE transactions
ADD COLUMN amount_abs DECIMAL(18,2) GENERATED ALWAYS AS (ABS(amount)) STORED;

CREATE INDEX CONCURRENTLY idx_transactions_amount_abs
ON transactions (amount_abs);

-- Option 2: Use two conditions instead of ABS
-- amount >= minAmount OR amount <= -minAmount
```

---

### 3.5 DATE() Function in GROUP BY

**Files:**
- `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts` (lines 413-424)
- `/src/modules/admin/application/services/admin.service.ts` (lines 451-458, 541-549)

**Problem:** `DATE(column)` in GROUP BY prevents index usage.

```typescript
.select('DATE(transaction.createdAt)', 'date')
.groupBy('DATE(transaction.createdAt)')
```

**Recommended Fix:** Create expression index

```sql
CREATE INDEX CONCURRENTLY idx_transactions_date_created
ON transactions (DATE(created_at));

CREATE INDEX CONCURRENTLY idx_users_date_created
ON auth.users (DATE(created_at));
```

---

### 3.6 Multiple Separate Queries in Dashboard Methods

**File:** `/src/modules/admin/application/services/admin.service.ts`

**Problem:** Dashboard fetches stats with multiple queries that could be combined.

**Recommended Fix:** Use Common Table Expressions (CTEs) or combine queries

```sql
WITH user_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
    COUNT(*) FILTER (WHERE kyc_status = 'pending') as kyc_pending,
    COUNT(*) FILTER (WHERE kyc_status = 'approved') as kyc_approved
  FROM auth.users
),
transaction_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE status = 'completed'), 0) as total_volume,
    COALESCE(SUM(ABS(amount)) FILTER (
      WHERE status = 'completed'
      AND created_at >= CURRENT_DATE
    ), 0) as today_volume
  FROM transactions
)
SELECT
  u.*, t.*
FROM user_stats u, transaction_stats t;
```

---

## 4. Query Optimization Recommendations

### 4.1 Use SELECT Specific Columns

Many queries select all columns (`SELECT *` / `find()`) when only specific fields are needed.

**Example - countByStatus:**
```typescript
// CURRENT: fetches all columns then counts
async countByStatus(): Promise<Record<CaseStatus, number>> {
  const result = await this.caseRepo
    .createQueryBuilder('case')
    .select('case.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('case.status')
    .getRawMany();
}
```

This is already optimal. But for cases like `findById` where only `status` is needed later:

```typescript
// Instead of fetching entire entity
const entity = await this.repo.findOne({ where: { id } });

// Select only needed fields
const entity = await this.repo.findOne({
  where: { id },
  select: ['id', 'status', 'updatedAt'],
});
```

---

### 4.2 Use Covering Indexes for Common Queries

For frequently-executed queries, create covering indexes that include all needed columns.

```sql
-- Cover common wallet lookup
CREATE INDEX CONCURRENTLY idx_wallets_covering_user
ON wallets (user_id)
INCLUDE (id, balance, status, currency);

-- Cover transaction lookup
CREATE INDEX CONCURRENTLY idx_transactions_covering_wallet
ON transactions (wallet_id, created_at DESC)
INCLUDE (id, type, amount, status);
```

---

### 4.3 Add Query Execution Monitoring

**Recommended:** Add slow query logging and monitoring.

```typescript
// data-source.ts
export const dataSourceOptions: DataSourceOptions = {
  // ... existing config
  logging: ['query', 'error', 'warn'],
  logger: 'advanced-console',
  maxQueryExecutionTime: 1000, // Log queries > 1s
};
```

**Create custom query logger:**
```typescript
// infrastructure/logging/query-logger.ts
import { Logger as TypeOrmLogger } from 'typeorm';
import { Logger } from '@nestjs/common';

export class CustomQueryLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const sql = query + (parameters?.length ? ` -- PARAMS: ${JSON.stringify(parameters)}` : '');
    this.logger.debug(sql);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    this.logger.warn(`SLOW QUERY (${time}ms): ${query}`);
    // Send to monitoring (Prometheus, DataDog, etc.)
  }
}
```

---

## 5. Migration Script

Execute the following migration to add all recommended indexes:

```sql
-- Migration: Add Performance Indexes
-- Generated: 2026-01-30

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- 1. Transactions Table
-- ===========================================

-- Composite index for filtered queries with pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_date_status
ON transactions (wallet_id, created_at DESC, status);

-- Daily volume calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_type_status_date
ON transactions (wallet_id, type, status, created_at DESC)
WHERE status IN ('completed', 'pending', 'processing');

-- Analytics time-series
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_date_status
ON transactions (DATE(created_at), status);

-- Text search (trigram)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_ref_trgm
ON transactions USING gin (yellow_card_ref gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_phone_trgm
ON transactions USING gin (recipient_phone gin_trgm_ops);

-- ===========================================
-- 2. Transfers Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_sender_created
ON transfers (sender_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_recipient_created
ON transfers (recipient_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_status_created
ON transfers (status, created_at DESC);

-- ===========================================
-- 3. Notifications Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
ON notifications (user_id, created_at DESC)
WHERE read_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_date
ON notifications (user_id, created_at DESC);

-- ===========================================
-- 4. Contacts Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_favorite_txcount
ON contacts (user_id, is_favorite DESC, transaction_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_last_transaction
ON contacts (user_id, last_transaction_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_name_trgm
ON contacts USING gin (name gin_trgm_ops);

-- ===========================================
-- 5. Sessions Table (auth schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active
ON auth.sessions (user_id, last_activity_at DESC)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active_expires
ON auth.sessions (expires_at)
WHERE is_active = true;

-- ===========================================
-- 6. Devices Table (auth schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_active
ON auth.devices (user_id, last_login_at DESC)
WHERE is_active = true;

-- ===========================================
-- 7. Users Table (auth schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm
ON auth.users USING gin (username gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_date_created
ON auth.users (DATE(created_at));

-- ===========================================
-- 8. Compliance Cases Table (compliance schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_cases_status_priority_date
ON compliance.cases (status, priority, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_cases_assigned_status
ON compliance.cases (assigned_to, status)
WHERE status NOT IN ('CLOSED');

-- ===========================================
-- 9. Support Tickets Table (system schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_status
ON system.support_tickets (user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_assigned_priority
ON system.support_tickets (assigned_to, priority DESC, created_at ASC)
WHERE status NOT IN ('resolved', 'closed');

-- ===========================================
-- 10. Referrals Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_code_status_expires
ON referrals (referral_code, status, expires_at)
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_status_completed
ON referrals (status, completed_at ASC)
WHERE status = 'completed';

-- ===========================================
-- 11. KYC Verifications Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_manual_review_queue
ON kyc_verifications (status, submitted_at ASC)
WHERE status = 'manual_review';

-- ===========================================
-- 12. Beneficiaries Table (wallet schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_wallet_favorite_last
ON wallet.beneficiaries (wallet_id, is_favorite DESC, last_transfer_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_wallet_type
ON wallet.beneficiaries (wallet_id, account_type, last_transfer_at DESC NULLS LAST);

-- ===========================================
-- 13. Savings Pots Table (wallet schema)
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_savings_pots_wallet_status
ON wallet.savings_pots (wallet_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_savings_pots_auto_deposit
ON wallet.savings_pots (status, auto_deposit_frequency)
WHERE status = 'active' AND auto_deposit_frequency IS NOT NULL;

-- ===========================================
-- 14. Payment Links Table
-- ===========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_links_user_status
ON payment_links (user_id, status, created_at DESC);

COMMIT;
```

---

## 6. Estimated Performance Improvements

| Query Pattern | Current Est. Time | After Optimization | Improvement |
|--------------|-------------------|-------------------|-------------|
| Dashboard stats (30d) | ~300ms (5 queries) | ~60ms (1 query) | 5x |
| Compliance risk trends (30d) | ~1500ms (60 queries) | ~50ms (2 queries) | 30x |
| Transaction history (paginated) | ~80ms | ~15ms | 5x |
| Contact search | ~120ms | ~20ms | 6x |
| Unread notifications count | ~50ms | ~5ms | 10x |
| Session cleanup job | ~200ms | ~30ms | 7x |

---

## 7. Implementation Priority

### High Priority (Implement This Week)
1. Add composite indexes for transactions table
2. Fix N+1 in compliance dashboard risk trends
3. Fix N+1 in admin user stats
4. Add pagination to `findAll()` methods

### Medium Priority (Implement This Month)
1. Add trigram indexes for text search
2. Add composite indexes for transfers, notifications, contacts
3. Create expression indexes for DATE() functions
4. Optimize wallet provider lookup

### Low Priority (Plan for Q2)
1. Add covering indexes for high-frequency queries
2. Implement query execution monitoring
3. Review and optimize remaining repositories

---

## 8. Monitoring Recommendations

### Query Performance Metrics to Track

1. **Average query execution time** by repository method
2. **Query count per request** to detect N+1 patterns
3. **Slow query count** (queries > 100ms)
4. **Index hit ratio** from pg_stat_user_indexes
5. **Sequential scan count** on large tables

### Recommended Tools

- **pg_stat_statements** - PostgreSQL extension for query statistics
- **pgBadger** - Log analyzer for PostgreSQL
- **Grafana + PostgreSQL exporter** - Real-time monitoring

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
  substring(query, 1, 50) as short_query,
  round(total_exec_time::numeric, 2) as total_time_ms,
  calls,
  round(mean_exec_time::numeric, 2) as mean_time_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER())::numeric, 2) as percentage
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

---

## Appendix: Index Size Estimation

| Index Name | Estimated Size |
|------------|---------------|
| idx_transactions_wallet_date_status | ~50 MB per 1M rows |
| idx_transactions_ref_trgm | ~100 MB per 1M rows |
| idx_transfers_sender_created | ~30 MB per 1M rows |
| idx_notifications_user_unread | ~10 MB per 1M rows |
| idx_contacts_name_trgm | ~20 MB per 100K rows |

**Total estimated index storage increase:** ~500 MB for 10M total records across all tables.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Author:** Database Architecture Analysis
