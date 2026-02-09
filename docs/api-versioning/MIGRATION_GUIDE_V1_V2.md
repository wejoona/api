# JoonaPay API Migration Guide: v1 to v2

Complete step-by-step guide for migrating from API v1 to v2, with code examples, common pitfalls, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes Summary](#breaking-changes-summary)
3. [Before You Start](#before-you-start)
4. [Migration Strategy](#migration-strategy)
5. [Endpoint-by-Endpoint Migration](#endpoint-by-endpoint-migration)
6. [Common Patterns](#common-patterns)
7. [Testing Your Migration](#testing-your-migration)
8. [Deployment Strategy](#deployment-strategy)
9. [Troubleshooting](#troubleshooting)
10. [Support](#support)

## Overview

### Why Migrate?

API v2 brings significant improvements:

1. **Precision:** Integer amounts eliminate floating-point rounding errors
2. **Consistency:** Standardized response formats across all endpoints
3. **Reliability:** Idempotency support prevents duplicate transactions
4. **Developer Experience:** Better error messages and structured error codes
5. **Extensibility:** Designed for future features like multi-currency support

### Timeline

| Date | Milestone |
|------|-----------|
| **2026-01-01** | v1 released (current) |
| **2026-07-01** | v2 released, v1 deprecated |
| **2027-01-01** | v1 deprecation warnings active |
| **2027-07-01** | v1 sunset (returns 410 Gone) |

**You have 18 months to migrate. Don't wait until the last minute!**

### Support Available

- **Documentation:** This guide + API reference
- **Sandbox:** Test environment with v2 enabled
- **Migration Tools:** Scripts, transformers, validators
- **Support Channels:** Email, Discord, office hours

## Breaking Changes Summary

### High-Impact Changes

These changes affect most integrations:

| Change | v1 | v2 | Impact |
|--------|----|----|--------|
| **Amount Format** | Float (50.00) | Integer cents (5000) | 🔴 High |
| **Response Structure** | Varies by endpoint | Standardized `data` wrapper | 🔴 High |
| **Error Format** | String messages | Structured error codes | 🔴 High |
| **Pagination** | Offset-based | Page-based | 🟡 Medium |
| **Balance Format** | Single currency | Multi-currency array | 🟡 Medium |

### Medium-Impact Changes

| Change | v1 | v2 | Impact |
|--------|----|----|--------|
| **Transfer Request** | Flat object | Nested recipient | 🟡 Medium |
| **Query Parameters** | Direct | `filter[]` prefix | 🟡 Medium |
| **Default Pagination Limit** | 20 | 25 | 🟢 Low |
| **Currency Code** | USD | USDC | 🟢 Low |

## Before You Start

### Prerequisites

- [ ] Active JoonaPay account
- [ ] Access to API credentials
- [ ] Sandbox environment access
- [ ] Current integration using v1
- [ ] Development environment for testing

### What You'll Need

1. **API Credentials**
   - API keys (same for v1 and v2)
   - Sandbox credentials
   - Test accounts

2. **Development Setup**
   - Code access to current integration
   - Test environment
   - Deployment pipeline access

3. **Documentation**
   - Your current v1 implementation docs
   - JoonaPay v2 API reference
   - This migration guide

### Assessment Checklist

Before migrating, identify:

- [ ] All v1 endpoints you currently use
- [ ] Where amounts are displayed/stored
- [ ] Where pagination is implemented
- [ ] Where errors are handled
- [ ] Custom retry logic
- [ ] Transaction webhooks
- [ ] Scheduled tasks using API

## Migration Strategy

### Recommended Approach

We recommend a **phased migration** approach:

```
Phase 1: Preparation (Week 1-2)
    ↓
Phase 2: Non-Critical Endpoints (Week 3-4)
    ↓
Phase 3: Critical Endpoints (Week 5-6)
    ↓
Phase 4: Testing & Validation (Week 7)
    ↓
Phase 5: Production Deployment (Week 8)
    ↓
Phase 6: Monitoring & Cleanup (Week 9-10)
```

### Phase 1: Preparation (2 weeks)

**Week 1: Setup**
- [ ] Set up sandbox environment
- [ ] Review this migration guide
- [ ] Audit current v1 usage
- [ ] Create migration task list
- [ ] Set up monitoring for v2

**Week 2: Foundation**
- [ ] Create utility functions for:
  - Amount conversion (dollars ↔ cents)
  - Response parsing
  - Error handling
- [ ] Update SDK to latest version
- [ ] Set up parallel testing infrastructure

### Phase 2: Non-Critical Endpoints (2 weeks)

Start with read-only, non-critical endpoints:

**Good Starting Points:**
1. `GET /wallet` (balance)
2. `GET /wallet/transactions` (history)
3. `GET /kyc/status`
4. `GET /recipients`

**Why Start Here:**
- Read-only (no risk of duplicate transactions)
- Easy to rollback
- Builds confidence
- Tests your utility functions

### Phase 3: Critical Endpoints (2 weeks)

Migrate write operations:

**Critical Endpoints:**
1. `POST /auth/verify-otp` (login)
2. `POST /wallet/transfer/internal` (transfers)
3. `POST /wallet/deposit/initiate` (deposits)
4. `POST /wallet/transfer/external` (withdrawals)

**Why Save for Later:**
- Higher risk
- Need thorough testing
- Require idempotency
- Need rollback plan

### Phase 4: Testing (1 week)

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load tests passing
- [ ] Error handling tested
- [ ] Rollback tested

### Phase 5: Deployment (1 week)

- [ ] Deploy to staging
- [ ] Smoke tests pass
- [ ] Gradual rollout to production (10% → 50% → 100%)
- [ ] Monitor error rates
- [ ] Be ready to rollback

### Phase 6: Monitoring & Cleanup (2 weeks)

- [ ] Monitor v2 usage
- [ ] Verify no v1 calls
- [ ] Remove v1 code
- [ ] Update documentation
- [ ] Notify JoonaPay of completion

## Endpoint-by-Endpoint Migration

### 1. Authentication

#### Login / OTP Verification

**Endpoint:** `POST /auth/verify-otp`

**v1 Implementation:**
```typescript
// v1
interface OtpVerifyRequestV1 {
  phone: string;
  otp: string;
}

interface OtpVerifyResponseV1 {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
  };
  kycStatus: string;
}

async function verifyOtpV1(phone: string, otp: string) {
  const response = await fetch('https://api.joonapay.com/api/v1/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });

  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.user;
}
```

**v2 Implementation:**
```typescript
// v2
interface OtpVerifyRequestV2 {
  phone: string;
  otp: string;
  deviceId?: string;  // Recommended for session tracking
}

interface OtpVerifyResponseV2 {
  tokens: {
    access: string;
    refresh: string;
    expiresIn: number;  // Seconds until expiry
  };
  user: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    username?: string;  // New in v2
  };
  session: {
    id: string;
    deviceId: string;
    createdAt: string;
  };
  kyc: {
    status: 'not_started' | 'pending' | 'manual_review' | 'approved' | 'rejected';
    tier: number;
    limits: {
      daily: number;   // In cents
      monthly: number; // In cents
    };
  };
}

async function verifyOtpV2(phone: string, otp: string, deviceId?: string) {
  const response = await fetch('https://api.joonapay.com/api/v2/auth/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId || generateDeviceId(),
    },
    body: JSON.stringify({ phone, otp, deviceId }),
  });

  if (!response.ok) {
    throw await handleV2Error(response);
  }

  const data = await response.json();

  // Store tokens with expiry
  localStorage.setItem('accessToken', data.tokens.access);
  localStorage.setItem('refreshToken', data.tokens.refresh);
  localStorage.setItem('tokenExpiresAt', Date.now() + (data.tokens.expiresIn * 1000));
  localStorage.setItem('sessionId', data.session.id);

  // Schedule token refresh
  scheduleTokenRefresh(data.tokens.expiresIn);

  return {
    user: data.user,
    kyc: data.kyc,
  };
}
```

**Key Changes:**
1. ✅ Tokens moved to `tokens` object
2. ✅ Token expiry now included
3. ✅ Session information added
4. ✅ KYC object restructured with more details
5. ✅ Limits now in cents (not dollars)

### 2. Wallet Balance

**Endpoint:** `GET /wallet`

**v1 Implementation:**
```typescript
// v1
interface BalanceResponseV1 {
  walletId: string;
  balance: number;      // 100.50 (dollars)
  currency: string;     // "USD"
}

async function getBalanceV1(): Promise<number> {
  const response = await authenticatedFetch('/api/v1/wallet');
  const data = await response.json();
  return data.balance;
}

// Display balance
const balance = await getBalanceV1();
console.log(`Balance: $${balance.toFixed(2)}`);
```

**v2 Implementation:**
```typescript
// v2
interface BalanceResponseV2 {
  walletId: string;
  balances: Array<{
    currency: string;   // "USDC"
    available: number;  // 10050 (cents)
    pending: number;    // 0 (cents)
    total: number;      // 10050 (cents)
  }>;
  limits: {
    daily: number;      // 1000000 (cents = $10,000)
    monthly: number;    // 5000000 (cents = $50,000)
    remaining: {
      daily: number;
      monthly: number;
    };
  };
}

// Utility function
function centsToDollars(cents: number): number {
  return cents / 100;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

async function getBalanceV2(): Promise<number> {
  const response = await authenticatedFetch('/api/v2/wallet');
  const data = await response.json();

  // Find USDC balance (or first balance if only one)
  const usdcBalance = data.balances.find(b => b.currency === 'USDC') || data.balances[0];

  // Convert from cents to dollars
  return centsToDollars(usdcBalance.available);
}

// Display balance (same as before!)
const balance = await getBalanceV2();
console.log(`Balance: $${balance.toFixed(2)}`);

// Or access full balance object
async function getFullBalanceV2() {
  const response = await authenticatedFetch('/api/v2/wallet');
  return response.json();
}

const fullBalance = await getFullBalanceV2();
console.log(`Available: $${centsToDollars(fullBalance.balances[0].available).toFixed(2)}`);
console.log(`Pending: $${centsToDollars(fullBalance.balances[0].pending).toFixed(2)}`);
console.log(`Daily Limit: $${centsToDollars(fullBalance.limits.daily).toFixed(2)}`);
console.log(`Daily Remaining: $${centsToDollars(fullBalance.limits.remaining.daily).toFixed(2)}`);
```

**Key Changes:**
1. ✅ Balance now in `balances` array (multi-currency ready)
2. ✅ Amounts in cents (integer), not dollars (float)
3. ✅ Separate `available`, `pending`, `total` balances
4. ✅ Limits included in response
5. ✅ Currency changed from "USD" to "USDC"

**Migration Tip:**
Create a `getBalanceV2()` function that mimics your v1 interface to minimize code changes:

```typescript
// Adapter function - drop-in replacement for v1
async function getBalance(): Promise<number> {
  const response = await authenticatedFetch('/api/v2/wallet');
  const data = await response.json();
  const balance = data.balances.find(b => b.currency === 'USDC');
  return centsToDollars(balance.available);
}
```

### 3. Internal Transfer

**Endpoint:** `POST /wallet/transfer/internal`

**v1 Implementation:**
```typescript
// v1
interface TransferRequestV1 {
  toPhone: string;
  amount: number;       // 50.00 (dollars)
  currency: string;     // "USD"
  note?: string;
}

interface TransferResponseV1 {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  toPhone: string;
  amount: number;
  currency: string;
  fee: number;
  status: string;
}

async function transferV1(toPhone: string, amount: number, note?: string) {
  const response = await authenticatedFetch('/api/v1/wallet/transfer/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pin-Token': await getPinToken(),
    },
    body: JSON.stringify({
      toPhone,
      amount,
      currency: 'USD',
      note,
    }),
  });

  const data = await response.json();
  return data.transactionId;
}

// Usage
const txId = await transferV1('+2250701234567', 50.00, 'Lunch money');
```

**v2 Implementation:**
```typescript
// v2
interface TransferRequestV2 {
  recipient: {
    type: 'phone' | 'username' | 'walletId';
    phone?: string;
    username?: string;
    walletId?: string;
  };
  amount: {
    value: number;      // 5000 (cents)
    currency: string;   // "USDC"
  };
  note?: string;
}

interface TransferResponseV2 {
  transfer: {
    id: string;
    reference: string;  // "INT-ABC123"
    type: 'internal';
    sender: {
      walletId: string;
      userId: string;
    };
    recipient: {
      walletId: string;
      phone?: string;
      username?: string;
    };
    amount: {
      value: number;    // In cents
      currency: string;
    };
    fee: {
      value: number;    // In cents
      currency: string;
    };
    status: {
      code: 'pending' | 'processing' | 'completed' | 'failed';
      updatedAt: string;
    };
    note?: string;
    timestamps: {
      created: string;
      completed?: string;
    };
  };
}

async function transferV2(
  toPhone: string,
  amountDollars: number,
  note?: string
): Promise<string> {
  // Generate idempotency key to prevent duplicates
  const idempotencyKey = `transfer-${Date.now()}-${Math.random()}`;

  const response = await authenticatedFetch('/api/v2/wallet/transfer/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pin-Token': await getPinToken(),
      'X-Idempotency-Key': idempotencyKey,  // NEW: Prevents duplicate transfers
      'X-Request-ID': generateRequestId(),   // NEW: For tracing
    },
    body: JSON.stringify({
      recipient: {
        type: 'phone',
        phone: toPhone,
      },
      amount: {
        value: dollarsToCents(amountDollars),  // Convert to cents
        currency: 'USDC',
      },
      note,
    }),
  });

  if (!response.ok) {
    throw await handleV2Error(response);
  }

  const data = await response.json();
  return data.transfer.id;
}

// Usage (same as before!)
const txId = await transferV2('+2250701234567', 50.00, 'Lunch money');
```

**Key Changes:**
1. ✅ `toPhone` → `recipient.phone` (nested object)
2. ✅ `amount` → `amount.value` in cents
3. ✅ Recipient type support (phone, username, walletId)
4. ✅ Idempotency key support (prevents duplicates)
5. ✅ Request ID for tracing
6. ✅ Response nested in `transfer` object
7. ✅ Detailed status with code and timestamp
8. ✅ Separate `sender` and `recipient` objects

**Important: Idempotency Keys**

Idempotency keys prevent duplicate transactions if a request is retried:

```typescript
// Good: Store idempotency key per transfer intent
interface TransferIntent {
  toPhone: string;
  amount: number;
  note?: string;
  idempotencyKey: string;  // Generate once, reuse on retry
}

async function transferWithRetry(intent: TransferIntent) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      return await transferV2WithKey(
        intent.toPhone,
        intent.amount,
        intent.note,
        intent.idempotencyKey  // Same key = same transfer
      );
    } catch (error) {
      if (isNetworkError(error) && attempts < maxAttempts - 1) {
        attempts++;
        await delay(1000 * attempts);  // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Transaction History

**Endpoint:** `GET /wallet/transactions`

**v1 Implementation:**
```typescript
// v1
interface TransactionsRequestV1 {
  limit?: number;    // Default: 20
  offset?: number;   // Default: 0
  type?: string;     // "deposit", "withdrawal", "transfer"
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface TransactionsResponseV1 {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;    // In dollars
    currency: string;
    status: string;
    createdAt: string;
    // ... other fields
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

async function getTransactionsV1(page: number = 0, limit: number = 20) {
  const offset = page * limit;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await authenticatedFetch(`/api/v1/wallet/transactions?${params}`);
  return response.json();
}

// Pagination example
let page = 0;
let hasMore = true;

while (hasMore) {
  const data = await getTransactionsV1(page, 20);
  processTransactions(data.transactions);
  hasMore = data.hasMore;
  page++;
}
```

**v2 Implementation:**
```typescript
// v2
interface TransactionsRequestV2 {
  page?: number;              // Default: 1 (1-based, not 0-based!)
  limit?: number;             // Default: 25
  sort?: string;              // "createdAt", "amount"
  order?: 'asc' | 'desc';     // Default: "desc"
  'filter[type]'?: string;    // Note the brackets!
  'filter[status]'?: string;
  'filter[dateFrom]'?: string;
  'filter[dateTo]'?: string;
}

interface TransactionsResponseV2 {
  data: Array<{
    id: string;
    reference: string;        // "TXN-ABC123"
    type: string;
    amount: {
      value: number;          // In cents
      currency: string;
    };
    fee: {
      value: number;
      currency: string;
    };
    status: {
      code: string;
      updatedAt: string;
    };
    timestamps: {
      created: string;
      completed?: string;
    };
    // ... other fields
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    currency: string;
    timezone: string;
  };
}

async function getTransactionsV2(page: number = 1, limit: number = 25) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: 'createdAt',
    order: 'desc',
  });

  const response = await authenticatedFetch(`/api/v2/wallet/transactions?${params}`);
  return response.json();
}

// Pagination example (note: page is 1-based now!)
let page = 1;
let hasMore = true;

while (hasMore) {
  const data = await getTransactionsV2(page, 25);

  // Convert amounts from cents to dollars for display
  const transactionsInDollars = data.data.map(tx => ({
    ...tx,
    amount: centsToDollars(tx.amount.value),
    fee: centsToDollars(tx.fee.value),
  }));

  processTransactions(transactionsInDollars);
  hasMore = data.pagination.hasNext;
  page++;
}
```

**Key Changes:**
1. ✅ Offset → Page-based (page is 1-based, not 0-based!)
2. ✅ Added `sort` and `order` parameters
3. ✅ Filter parameters now use `filter[]` prefix
4. ✅ Response in `data` array (not `transactions`)
5. ✅ Pagination object with more info (`totalPages`, `hasNext`, `hasPrev`)
6. ✅ Amounts in cents
7. ✅ Separate `amount` and `fee` objects

**Migration Tip: Filtering**

```typescript
// v1
const params = new URLSearchParams({
  type: 'deposit',
  status: 'completed',
  startDate: '2026-01-01',
});

// v2 - note the filter[] prefix!
const params = new URLSearchParams({
  'filter[type]': 'deposit',
  'filter[status]': 'completed',
  'filter[dateFrom]': '2026-01-01',
});
```

### 5. Deposit Initiation

**Endpoint:** `POST /wallet/deposit/initiate`

**v1 Implementation:**
```typescript
// v1
interface DepositRequestV1 {
  amount: number;           // 10000 (XOF, local currency)
  sourceCurrency: string;   // "XOF"
  channelId: string;        // Mobile money channel
}

interface DepositResponseV1 {
  transactionId: string;
  depositId: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  fee: number;
  estimatedAmount: number;
  paymentInstructions: {
    type: string;
    provider: string;
    accountNumber: string;
    reference: string;
    instructions: string;
  };
  expiresAt: string;
}

async function initiateDepositV1(amount: number, channelId: string) {
  const response = await authenticatedFetch('/api/v1/wallet/deposit/initiate', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      sourceCurrency: 'XOF',
      channelId,
    }),
  });

  const data = await response.json();
  return data;
}
```

**v2 Implementation:**
```typescript
// v2
interface DepositRequestV2 {
  source: {
    amount: number;         // 10000 (XOF, NOT in cents!)
    currency: string;       // "XOF"
  };
  channel: {
    id: string;
    provider?: string;
  };
  callback?: {
    url: string;
    events: string[];
  };
}

interface DepositResponseV2 {
  deposit: {
    id: string;
    reference: string;      // "DEP-ABC123"
    amount: {
      source: {
        value: number;      // 10000 (XOF)
        currency: string;
      };
      target: {
        value: number;      // 1670 (USDC cents)
        currency: string;
      };
    };
    rate: {
      value: number;        // 600 (XOF per USDC)
      expiresAt: string;
    };
    fee: {
      value: number;        // 50 (USDC cents)
      currency: string;
      breakdown?: Array<{
        type: string;       // "processing", "network"
        value: number;
      }>;
    };
    instructions: {
      type: 'mobile_money' | 'bank_transfer';
      provider: string;     // "orange_money"
      details: {
        accountNumber?: string;
        accountName?: string;
        reference: string;
      };
      steps: string[];      // ["Open Orange Money app", "Send to ..."]
    };
    status: {
      code: 'pending' | 'processing' | 'completed' | 'expired' | 'failed';
      updatedAt: string;
    };
    expiresAt: string;
    timestamps: {
      created: string;
      completed?: string;
    };
  };
}

async function initiateDepositV2(amountXof: number, channelId: string) {
  const response = await authenticatedFetch('/api/v2/wallet/deposit/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': generateRequestId(),
    },
    body: JSON.stringify({
      source: {
        amount: amountXof,  // Keep in XOF (not cents)
        currency: 'XOF',
      },
      channel: {
        id: channelId,
      },
    }),
  });

  if (!response.ok) {
    throw await handleV2Error(response);
  }

  const data = await response.json();
  return data.deposit;
}

// Usage
const deposit = await initiateDepositV2(10000, 'orange-money-ci');

console.log(`Send ${deposit.amount.source.value} XOF to:`);
console.log(`Account: ${deposit.instructions.details.accountNumber}`);
console.log(`Reference: ${deposit.instructions.details.reference}`);
console.log(`You will receive: $${centsToDollars(deposit.amount.target.value).toFixed(2)} USDC`);
console.log(`Fee: $${centsToDollars(deposit.fee.value).toFixed(2)}`);
console.log(`Expires at: ${deposit.expiresAt}`);
```

**Key Changes:**
1. ✅ `amount` → `source.amount` (nested)
2. ✅ Target amount in cents (USDC)
3. ✅ Source amount stays in local currency units (NOT cents)
4. ✅ Fee breakdown available
5. ✅ Structured instructions with steps
6. ✅ Response nested in `deposit` object

**Important: Source vs Target Currency**

- **Source (XOF, NGN, etc.):** Keep in local currency units (10000 = 10,000 XOF)
- **Target (USDC):** Use cents (1670 = $16.70 USDC)

This is because:
- XOF doesn't have subdivisions (no "cents")
- USDC needs precision (hence cents)

### 6. KYC Status

**Endpoint:** `GET /kyc/status` (note: moved from `/wallet/kyc/status`)

**v1 Implementation:**
```typescript
// v1
interface KycStatusV1 {
  status: string;           // "approved", "pending", etc.
  score: number;
  submittedAt: string;
  approvedAt?: string;
  canResubmit: boolean;
}

async function getKycStatusV1() {
  const response = await authenticatedFetch('/api/v1/wallet/kyc/status');
  return response.json();
}
```

**v2 Implementation:**
```typescript
// v2
interface KycStatusV2 {
  kyc: {
    status: 'not_started' | 'pending' | 'manual_review' | 'approved' | 'rejected';
    tier: 1 | 2 | 3;
    verification: {
      score: number;
      method: 'auto' | 'manual';
      provider: string;
    };
    timestamps: {
      submitted?: string;
      approved?: string;
      rejected?: string;
    };
    limits: {
      daily: number;        // In cents
      monthly: number;      // In cents
    };
    documents: {
      idVerified: boolean;
      selfieVerified: boolean;
      addressVerified: boolean;
    };
    canResubmit: boolean;
    nextSteps?: string[];   // ["Upload proof of address"]
  };
}

async function getKycStatusV2() {
  const response = await authenticatedFetch('/api/v2/kyc/status');  // Note: /kyc not /wallet/kyc

  if (!response.ok) {
    throw await handleV2Error(response);
  }

  return response.json();
}

// Usage
const { kyc } = await getKycStatusV2();

console.log(`KYC Status: ${kyc.status}`);
console.log(`Tier: ${kyc.tier}`);
console.log(`Daily Limit: $${centsToDollars(kyc.limits.daily).toFixed(2)}`);
console.log(`Monthly Limit: $${centsToDollars(kyc.limits.monthly).toFixed(2)}`);

if (kyc.nextSteps) {
  console.log('Next steps:', kyc.nextSteps.join(', '));
}
```

**Key Changes:**
1. ✅ Endpoint moved from `/wallet/kyc/status` to `/kyc/status`
2. ✅ Response nested in `kyc` object
3. ✅ Status enum with specific values
4. ✅ Tier information added
5. ✅ Limits now in cents
6. ✅ Document verification details
7. ✅ Next steps guidance

## Common Patterns

### Pattern 1: Amount Conversion

Create utility functions for consistent conversion:

```typescript
// utils/currency.ts

/**
 * Convert dollars to cents (for API requests)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (for display)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format amount for display
 */
export function formatAmount(cents: number, currency: string = 'USDC'): string {
  const dollars = centsToDollars(cents);

  if (currency === 'USDC' || currency === 'USD') {
    return `$${dollars.toFixed(2)}`;
  }

  // For XOF, NGN, etc. (no decimal places)
  return `${cents.toLocaleString()} ${currency}`;
}

/**
 * Parse user input to cents
 */
export function parseInputToCents(input: string): number {
  // Remove currency symbols and commas
  const cleaned = input.replace(/[^0-9.]/g, '');
  const dollars = parseFloat(cleaned);

  if (isNaN(dollars)) {
    throw new Error('Invalid amount');
  }

  return dollarsToCents(dollars);
}
```

**Usage:**
```typescript
// In your components
import { dollarsToCents, formatAmount, parseInputToCents } from './utils/currency';

// Display
const balanceDisplay = formatAmount(balance.balances[0].available);  // "$100.50"

// Send to API
const amountToSend = dollarsToCents(50.00);  // 5000

// Parse user input
const userInput = "$50.00";
const cents = parseInputToCents(userInput);  // 5000
```

### Pattern 2: Error Handling

Create a centralized error handler:

```typescript
// utils/api-error.ts

export interface ApiErrorV2 {
  error: {
    code: string;
    message: string;
    details?: any;
    hint?: string;
  };
  requestId: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public hint?: string,
    public details?: any,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleV2Error(response: Response): Promise<never> {
  let errorData: ApiErrorV2;

  try {
    errorData = await response.json();
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  throw new ApiError(
    errorData.error.code,
    errorData.error.message,
    errorData.error.hint,
    errorData.error.details,
    errorData.requestId,
  );
}

// Usage in UI
try {
  await transferV2(phone, amount);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'PIN_INVALID':
        showError('Incorrect PIN. Please try again.');
        break;

      case 'PIN_LOCKED':
        const lockedUntil = error.details?.lockedUntil;
        showError(`PIN locked until ${new Date(lockedUntil).toLocaleString()}`);
        break;

      case 'INSUFFICIENT_BALANCE':
        showError('Insufficient balance. Please add funds and try again.');
        break;

      case 'LIMIT_DAILY_EXCEEDED':
        const limit = error.details?.limit;
        showError(`Daily limit exceeded. Limit: ${formatAmount(limit)}`);
        break;

      case 'RECIPIENT_NOT_FOUND':
        showError('Recipient not found. Please check the phone number.');
        if (error.hint) {
          showHint(error.hint);
        }
        break;

      default:
        showError(error.message);
        console.error(`Request ID: ${error.requestId}`);
    }
  } else {
    showError('An unexpected error occurred. Please try again.');
  }
}
```

### Pattern 3: Request Tracing

Add request IDs for debugging:

```typescript
// utils/request-id.ts

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Fetch wrapper with automatic request ID
 */
export async function authenticatedFetchWithTracing(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const requestId = generateRequestId();

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${getAccessToken()}`,
    'X-Request-ID': requestId,
    'X-Device-ID': getDeviceId(),
    'X-Client-Version': '2.1.0',  // Your app version
  };

  console.log(`[${requestId}] ${options.method || 'GET'} ${url}`);

  const startTime = Date.now();

  try {
    const response = await fetch(url, { ...options, headers });
    const duration = Date.now() - startTime;

    console.log(`[${requestId}] ${response.status} ${response.statusText} (${duration}ms)`);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, error);
    throw error;
  }
}
```

### Pattern 4: Idempotency

Implement idempotency for write operations:

```typescript
// utils/idempotency.ts

interface IdempotentRequest {
  key: string;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  response?: any;
  error?: any;
}

class IdempotencyManager {
  private requests = new Map<string, IdempotentRequest>();

  /**
   * Generate idempotency key for a request
   */
  generateKey(operation: string, params: any): string {
    const paramsStr = JSON.stringify(params);
    return `${operation}-${Date.now()}-${hashCode(paramsStr)}`;
  }

  /**
   * Check if request was already made
   */
  async executeIdempotent<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Check if we already have this request
    const existing = this.requests.get(key);

    if (existing) {
      if (existing.status === 'success') {
        console.log(`Using cached response for ${key}`);
        return existing.response;
      }

      if (existing.status === 'error') {
        throw existing.error;
      }

      // Still pending, wait for it
      console.log(`Waiting for pending request ${key}`);
      return this.waitForRequest(key);
    }

    // New request
    this.requests.set(key, {
      key,
      timestamp: Date.now(),
      status: 'pending',
    });

    try {
      const response = await operation();

      this.requests.set(key, {
        key,
        timestamp: Date.now(),
        status: 'success',
        response,
      });

      return response;
    } catch (error) {
      this.requests.set(key, {
        key,
        timestamp: Date.now(),
        status: 'error',
        error,
      });

      throw error;
    }
  }

  private async waitForRequest<T>(key: string): Promise<T> {
    // Poll until request completes
    while (true) {
      await delay(100);

      const request = this.requests.get(key);
      if (!request) {
        throw new Error('Request disappeared');
      }

      if (request.status === 'success') {
        return request.response;
      }

      if (request.status === 'error') {
        throw request.error;
      }
    }
  }
}

const idempotency = new IdempotencyManager();

// Usage
async function transferWithIdempotency(
  phone: string,
  amount: number,
  note?: string,
) {
  const key = idempotency.generateKey('transfer', { phone, amount, note });

  return idempotency.executeIdempotent(key, async () => {
    return authenticatedFetch('/api/v2/wallet/transfer/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pin-Token': await getPinToken(),
        'X-Idempotency-Key': key,
      },
      body: JSON.stringify({
        recipient: { type: 'phone', phone },
        amount: { value: dollarsToCents(amount), currency: 'USDC' },
        note,
      }),
    });
  });
}
```

### Pattern 5: Pagination Helper

Create a pagination helper:

```typescript
// utils/pagination.ts

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Fetch all pages of a paginated endpoint
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit: number = 25,
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPage(page, limit);
    allItems.push(...response.data);
    hasMore = response.pagination.hasNext;
    page++;
  }

  return allItems;
}

/**
 * Convert offset-based to page-based pagination
 */
export function offsetToPage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

/**
 * Convert page-based to offset-based pagination
 */
export function pageToOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

// Usage
async function getAllTransactions() {
  return fetchAllPages(async (page, limit) => {
    const response = await authenticatedFetch(
      `/api/v2/wallet/transactions?page=${page}&limit=${limit}`
    );
    return response.json();
  });
}

// Or migrate from v1 offset to v2 page
const oldOffset = 40;
const oldLimit = 20;
const newPage = offsetToPage(oldOffset, oldLimit);  // 3
```

## Testing Your Migration

### Unit Testing

Test your utility functions:

```typescript
// __tests__/currency.test.ts

import { dollarsToCents, centsToDollars, formatAmount } from '../utils/currency';

describe('Currency Utils', () => {
  describe('dollarsToCents', () => {
    it('converts dollars to cents', () => {
      expect(dollarsToCents(50.00)).toBe(5000);
      expect(dollarsToCents(100.50)).toBe(10050);
      expect(dollarsToCents(0.01)).toBe(1);
    });

    it('rounds to nearest cent', () => {
      expect(dollarsToCents(10.555)).toBe(1056);
      expect(dollarsToCents(10.554)).toBe(1055);
    });
  });

  describe('centsToDollars', () => {
    it('converts cents to dollars', () => {
      expect(centsToDollars(5000)).toBe(50.00);
      expect(centsToDollars(10050)).toBe(100.50);
      expect(centsToDollars(1)).toBe(0.01);
    });
  });

  describe('formatAmount', () => {
    it('formats USDC amounts', () => {
      expect(formatAmount(5000, 'USDC')).toBe('$50.00');
      expect(formatAmount(10050, 'USDC')).toBe('$100.50');
    });

    it('formats XOF amounts', () => {
      expect(formatAmount(10000, 'XOF')).toBe('10,000 XOF');
    });
  });
});
```

### Integration Testing

Test v2 endpoints in sandbox:

```typescript
// __tests__/integration/wallet.test.ts

describe('Wallet API v2', () => {
  const API_BASE = 'https://sandbox.api.joonapay.com/api/v2';
  let accessToken: string;

  beforeAll(async () => {
    // Login to get access token
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+2250701234567',
        otp: '123456',  // Test OTP
      }),
    });

    const data = await response.json();
    accessToken = data.tokens.access;
  });

  describe('GET /wallet', () => {
    it('returns balance in v2 format', async () => {
      const response = await fetch(`${API_BASE}/wallet`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();

      // Check v2 structure
      expect(data).toHaveProperty('walletId');
      expect(data).toHaveProperty('balances');
      expect(data.balances).toBeInstanceOf(Array);
      expect(data.balances[0]).toHaveProperty('currency');
      expect(data.balances[0]).toHaveProperty('available');
      expect(data.balances[0]).toHaveProperty('pending');
      expect(data.balances[0]).toHaveProperty('total');

      // Check amounts are integers (cents)
      expect(Number.isInteger(data.balances[0].available)).toBe(true);

      // Check headers
      expect(response.headers.get('X-API-Version')).toBe('2.0.0');
    });
  });

  describe('POST /wallet/transfer/internal', () => {
    it('creates transfer with v2 format', async () => {
      const response = await fetch(`${API_BASE}/wallet/transfer/internal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Pin-Token': 'test-pin-token',
          'X-Idempotency-Key': `test-${Date.now()}`,
        },
        body: JSON.stringify({
          recipient: {
            type: 'phone',
            phone: '+2250709876543',
          },
          amount: {
            value: 1000,  // $10.00
            currency: 'USDC',
          },
          note: 'Test transfer',
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();

      // Check v2 structure
      expect(data).toHaveProperty('transfer');
      expect(data.transfer).toHaveProperty('id');
      expect(data.transfer).toHaveProperty('reference');
      expect(data.transfer).toHaveProperty('amount');
      expect(data.transfer.amount).toHaveProperty('value');
      expect(data.transfer.amount).toHaveProperty('currency');
      expect(data.transfer.amount.value).toBe(1000);
    });
  });
});
```

### Error Handling Testing

```typescript
// __tests__/integration/errors.test.ts

describe('Error Handling v2', () => {
  it('returns structured error for invalid PIN', async () => {
    const response = await fetch(`${API_BASE}/wallet/transfer/internal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Pin-Token': 'wrong-pin',
      },
      body: JSON.stringify({
        recipient: { type: 'phone', phone: '+2250709876543' },
        amount: { value: 1000, currency: 'USDC' },
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const error = await response.json();

    // Check v2 error structure
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code');
    expect(error.error).toHaveProperty('message');
    expect(error).toHaveProperty('requestId');
    expect(error).toHaveProperty('timestamp');

    // Check error code
    expect(error.error.code).toBe('PIN_INVALID');

    // Check hint is provided
    expect(error.error).toHaveProperty('hint');
  });

  it('returns structured error for insufficient balance', async () => {
    const response = await fetch(`${API_BASE}/wallet/transfer/internal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Pin-Token': validPinToken,
      },
      body: JSON.stringify({
        recipient: { type: 'phone', phone: '+2250709876543' },
        amount: { value: 9999999999, currency: 'USDC' },  // Huge amount
      }),
    });

    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.error.code).toBe('INSUFFICIENT_BALANCE');
  });
});
```

### Parallel Testing

Test v1 and v2 side-by-side:

```typescript
// __tests__/parallel/comparison.test.ts

describe('v1 vs v2 Comparison', () => {
  it('returns equivalent balance data', async () => {
    // Fetch from v1
    const v1Response = await fetch(`${API_BASE_V1}/wallet`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const v1Data = await v1Response.json();

    // Fetch from v2
    const v2Response = await fetch(`${API_BASE_V2}/wallet`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const v2Data = await v2Response.json();

    // Convert v2 to v1 format for comparison
    const v2Balance = centsToDollars(v2Data.balances[0].available);

    // Should be the same
    expect(v2Balance).toBeCloseTo(v1Data.balance, 2);
  });
});
```

## Deployment Strategy

### Gradual Rollout

Deploy v2 integration gradually:

```typescript
// Feature flag for v2
const useV2 = getFeatureFlag('api-v2-enabled', false);

// Percentage rollout
const useV2ForUser = () => {
  const userId = getCurrentUserId();
  const hash = hashCode(userId);
  const percentage = getFeatureFlag('api-v2-percentage', 0);  // 0-100
  return (hash % 100) < percentage;
};

// Fetch balance with gradual rollout
async function getBalance() {
  if (useV2ForUser()) {
    return getBalanceV2();
  } else {
    return getBalanceV1();
  }
}
```

### Rollback Plan

Be prepared to rollback:

```typescript
// Emergency rollback
if (detectV2Issues()) {
  setFeatureFlag('api-v2-enabled', false);
  alertTeam('Rolled back to v1 due to issues');
}

// Monitor error rates
const v2ErrorRate = getErrorRate('api-v2');
if (v2ErrorRate > THRESHOLD) {
  rollbackToV1();
}
```

### Monitoring

Monitor key metrics:

```typescript
// Track API version usage
analytics.track('api_call', {
  version: 'v2',
  endpoint: '/wallet',
  duration: 123,
  success: true,
});

// Track errors
analytics.track('api_error', {
  version: 'v2',
  endpoint: '/wallet/transfer/internal',
  errorCode: 'PIN_INVALID',
  requestId: '...',
});

// Dashboard metrics
- Request success rate (v1 vs v2)
- Average response time (v1 vs v2)
- Error rates by endpoint
- Migration progress (% of users on v2)
```

## Troubleshooting

### Common Issues

#### Issue 1: Amount Off by 100x

**Symptom:** Amounts are 100x larger/smaller than expected

**Cause:** Forgetting to convert between dollars and cents

**Solution:**
```typescript
// Wrong
const amount = 50.00;
api.transfer({ amount: { value: amount, currency: 'USDC' } });  // Sends $0.50 instead of $50!

// Right
const amount = 50.00;
api.transfer({ amount: { value: dollarsToCents(amount), currency: 'USDC' } });  // Sends $50.00
```

#### Issue 2: Pagination Off by One

**Symptom:** Missing first/last page of results

**Cause:** v1 uses 0-based offset, v2 uses 1-based pages

**Solution:**
```typescript
// Wrong - starting at page 0
for (let page = 0; hasMore; page++) {  // ❌
  const data = await getTransactionsV2(page);
  // ...
}

// Right - starting at page 1
for (let page = 1; hasMore; page++) {  // ✅
  const data = await getTransactionsV2(page);
  // ...
}
```

#### Issue 3: Error Messages Not Showing

**Symptom:** Generic error instead of specific message

**Cause:** Not handling v2 error structure

**Solution:**
```typescript
// Wrong - v1 error handling
catch (error) {
  alert(error.message);  // Might be "[object Object]"
}

// Right - v2 error handling
catch (error) {
  if (error instanceof ApiError) {
    alert(error.message);  // User-friendly message
    if (error.hint) {
      alert(error.hint);  // Helpful hint
    }
  }
}
```

#### Issue 4: Missing Query Parameters

**Symptom:** Filters not working

**Cause:** v2 requires `filter[]` prefix

**Solution:**
```typescript
// Wrong
const params = new URLSearchParams({
  type: 'deposit',  // ❌ Ignored in v2
});

// Right
const params = new URLSearchParams({
  'filter[type]': 'deposit',  // ✅ Works in v2
});
```

#### Issue 5: Duplicate Transactions

**Symptom:** Same transfer created multiple times

**Cause:** Not using idempotency keys

**Solution:**
```typescript
// Wrong - no idempotency
await api.transfer(phone, amount);
// If network error, retry creates duplicate!

// Right - with idempotency
const key = generateIdempotencyKey();
await api.transfer(phone, amount, { idempotencyKey: key });
// Retry with same key won't create duplicate
```

### Getting Help

If you're stuck:

1. **Check Request ID:** Include in support ticket
   ```
   X-Request-ID: abc-123-def
   ```

2. **Check Response Headers:** Look for deprecation warnings
   ```
   X-API-Deprecated: true
   X-API-Deprecation-Info: ...
   ```

3. **Compare with v1:** Test same operation in v1 vs v2

4. **Use Postman:** Import v2 collection for testing

5. **Contact Support:**
   - Email: migration@joonapay.com
   - Discord: #api-migration
   - Office Hours: Tuesdays 2-4 PM WAT

## Checklist

Use this checklist to track your migration:

### Pre-Migration
- [ ] Reviewed VERSION_HISTORY.md
- [ ] Reviewed this migration guide
- [ ] Set up sandbox account
- [ ] Identified all affected code
- [ ] Created utility functions (amount conversion, error handling)

### Development
- [ ] Updated API base URL (or added v2 alongside v1)
- [ ] Updated authentication (session ID, token expiry)
- [ ] Updated balance endpoint
- [ ] Updated transaction history
- [ ] Updated transfer endpoints
- [ ] Updated deposit endpoints
- [ ] Updated KYC endpoints
- [ ] Added idempotency keys
- [ ] Added request IDs
- [ ] Updated error handling

### Testing
- [ ] Unit tests passing
- [ ] Integration tests with sandbox
- [ ] Error handling tested
- [ ] Pagination tested
- [ ] Amount conversion tested
- [ ] Load testing completed

### Deployment
- [ ] Feature flag implemented
- [ ] Gradual rollout plan created
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] Deployed to production (10%)
- [ ] Deployed to production (50%)
- [ ] Deployed to production (100%)

### Post-Deployment
- [ ] Monitoring shows healthy metrics
- [ ] No increase in error rates
- [ ] v1 code removed
- [ ] Documentation updated
- [ ] JoonaPay notified of completion

## Support

### Resources

- **Documentation:** https://docs.joonapay.com/v2
- **API Reference:** https://docs.joonapay.com/api/v2
- **Sandbox:** https://sandbox.api.joonapay.com/api/v2
- **Status Page:** https://status.joonapay.com

### Contact

- **Migration Support:** migration@joonapay.com
- **General Support:** api-support@joonapay.com
- **Discord:** https://discord.gg/joonapay (#api-migration)
- **Office Hours:** Tuesdays 2-4 PM WAT (Zoom link in emails)

### Emergency

For critical production issues:
- **Email:** security@joonapay.com
- **Phone:** +225 XX XX XX XX (24/7)

---

**Good luck with your migration!**

Remember: Take it slow, test thoroughly, and don't hesitate to ask for help.

**Last Updated:** January 30, 2026
