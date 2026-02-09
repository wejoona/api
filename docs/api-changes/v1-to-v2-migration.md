# API v1 to v2 Migration Guide

This comprehensive guide helps you migrate from JoonaPay API v1 to v2.

## Overview

API v2 introduces significant improvements focused on:

1. **Consistency**: Unified response formats across all endpoints
2. **Precision**: Integer amounts in cents to avoid floating-point issues
3. **Extensibility**: Structured objects for future feature additions
4. **Developer Experience**: Better error messages and pagination

## Timeline

| Date       | Event                              |
|------------|------------------------------------|
| 2026-07-01 | v2 released, v1 deprecated         |
| 2027-01-01 | v1 deprecation warnings in headers |
| 2027-07-01 | v1 sunset (410 Gone)               |

## Quick Start

### Step 1: Update Base URL

```diff
- const API_BASE = 'https://api.joonapay.com/api/v1';
+ const API_BASE = 'https://api.joonapay.com/api/v2';
```

### Step 2: Update Amount Handling

```typescript
// v1: Amounts in dollars (float)
const amountV1 = 50.00; // $50.00

// v2: Amounts in cents (integer)
const amountV2 = 5000; // 5000 cents = $50.00

// Conversion helpers
const toCents = (dollars: number) => Math.round(dollars * 100);
const toDollars = (cents: number) => cents / 100;
```

### Step 3: Update Response Parsing

```typescript
// v1 response parsing
const balanceV1 = response.balance; // 100.50

// v2 response parsing
const balanceV2 = response.balances[0].available; // 10050 (cents)
const balanceDollars = balanceV2 / 100; // 100.50
```

## Endpoint-by-Endpoint Migration

### Wallet Balance

#### Request (No Change)

```http
GET /api/v2/wallet
Authorization: Bearer <token>
```

#### Response Changes

```typescript
// v1 Response
interface BalanceV1 {
  walletId: string;
  balance: number;      // 100.50 (dollars)
  currency: string;     // "USD"
}

// v2 Response
interface BalanceV2 {
  walletId: string;
  balances: Array<{
    currency: string;   // "USDC"
    available: number;  // 10050 (cents)
    pending: number;    // 0
    total: number;      // 10050
  }>;
  limits: {
    daily: number;
    monthly: number;
    remaining: {
      daily: number;
      monthly: number;
    };
  };
}
```

#### Migration Code

```typescript
// Before (v1)
async function getBalanceV1(): Promise<number> {
  const response = await api.get('/wallet');
  return response.data.balance;
}

// After (v2)
async function getBalanceV2(): Promise<number> {
  const response = await api.get('/wallet');
  const balance = response.data.balances.find(b => b.currency === 'USDC');
  return balance ? balance.available / 100 : 0;
}
```

### Internal Transfer

#### Request Changes

```typescript
// v1 Request
interface TransferRequestV1 {
  toPhone: string;      // "+2250701234567"
  amount: number;       // 50.00 (dollars)
  currency: string;     // "USD"
}

// v2 Request
interface TransferRequestV2 {
  recipient: {
    phone?: string;     // "+2250701234567"
    username?: string;  // "@johndoe"
    walletId?: string;  // "wallet-123"
    type: 'phone' | 'username' | 'walletId';
  };
  amount: {
    value: number;      // 5000 (cents)
    currency: string;   // "USDC"
  };
  note?: string;
  idempotencyKey?: string;
}
```

#### Response Changes

```typescript
// v1 Response
interface TransferResponseV1 {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  toPhone: string;
  amount: number;       // 50.00
  currency: string;
  fee: number;          // 0.00
  status: string;
}

// v2 Response
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
      value: number;    // 5000 (cents)
      currency: string;
    };
    fee: {
      value: number;    // 0
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
```

#### Migration Code

```typescript
// Before (v1)
async function transferV1(phone: string, amount: number): Promise<string> {
  const response = await api.post('/wallet/transfer/internal', {
    toPhone: phone,
    amount: amount,
    currency: 'USD',
  }, {
    headers: {
      'X-Pin-Token': pinToken,
    },
  });
  return response.data.transactionId;
}

// After (v2)
async function transferV2(phone: string, amountDollars: number): Promise<string> {
  const response = await api.post('/wallet/transfer/internal', {
    recipient: {
      phone: phone,
      type: 'phone',
    },
    amount: {
      value: Math.round(amountDollars * 100), // Convert to cents
      currency: 'USDC',
    },
  }, {
    headers: {
      'X-Pin-Token': pinToken,
      'X-Request-ID': generateRequestId(),
    },
  });
  return response.data.transfer.id;
}
```

### External Transfer (Withdrawal)

#### Request Changes

```typescript
// v1 Request
interface ExternalTransferV1 {
  toAddress: string;
  amount: number;       // 50.00
  currency: string;
  network: string;
}

// v2 Request
interface ExternalTransferV2 {
  destination: {
    address: string;
    network: 'polygon' | 'ethereum' | 'solana';
  };
  amount: {
    value: number;      // 5000 (cents)
    currency: string;
  };
  note?: string;
}
```

### Deposit Initiation

#### Request Changes

```typescript
// v1 Request
interface DepositRequestV1 {
  amount: number;           // 10000 (XOF)
  sourceCurrency: string;   // "XOF"
  channelId: string;
}

// v2 Request
interface DepositRequestV2 {
  source: {
    amount: number;         // 10000
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
```

#### Response Changes

```typescript
// v1 Response
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

// v2 Response
interface DepositResponseV2 {
  deposit: {
    id: string;
    reference: string;
    amount: {
      source: { value: number; currency: string; };
      target: { value: number; currency: string; };
    };
    rate: {
      value: number;
      expiresAt: string;
    };
    fee: {
      value: number;
      currency: string;
      breakdown?: Array<{ type: string; value: number; }>;
    };
    instructions: {
      type: 'mobile_money' | 'bank_transfer';
      provider: string;
      details: {
        accountNumber?: string;
        accountName?: string;
        bankName?: string;
        reference: string;
      };
      steps: string[];
    };
    status: string;
    expiresAt: string;
  };
}
```

### Transaction History

#### Request Changes

```http
# v1 - Offset-based pagination
GET /api/v1/wallet/transactions?limit=20&offset=40

# v2 - Page-based pagination
GET /api/v2/wallet/transactions?page=3&limit=20
```

#### Query Parameters

| v1 Parameter | v2 Parameter     | Notes                           |
|--------------|------------------|--------------------------------|
| `limit`      | `limit`          | Same (default changed 20 -> 25)|
| `offset`     | `page`           | `page = (offset / limit) + 1`  |
| `type`       | `filter[type]`   | Now prefixed with `filter`     |
| `status`     | `filter[status]` | Now prefixed with `filter`     |
| `startDate`  | `filter[dateFrom]` | Renamed                      |
| `endDate`    | `filter[dateTo]` | Renamed                        |
| -            | `sort`           | New: sort field                |
| -            | `order`          | New: asc/desc                  |

#### Response Changes

```typescript
// v1 Response
interface TransactionsV1 {
  transactions: TransactionV1[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// v2 Response
interface TransactionsV2 {
  data: TransactionV2[];
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
```

#### Migration Code

```typescript
// Before (v1)
async function getTransactionsV1(offset: number, limit: number) {
  const response = await api.get('/wallet/transactions', {
    params: { offset, limit, type: 'deposit' },
  });
  return {
    items: response.data.transactions,
    hasMore: response.data.hasMore,
    total: response.data.total,
  };
}

// After (v2)
async function getTransactionsV2(page: number, limit: number) {
  const response = await api.get('/wallet/transactions', {
    params: {
      page,
      limit,
      'filter[type]': 'deposit',
      sort: 'createdAt',
      order: 'desc',
    },
  });
  return {
    items: response.data.data.map(tx => ({
      ...tx,
      amount: tx.amount.value / 100, // Convert from cents
    })),
    hasMore: response.data.pagination.hasNext,
    total: response.data.pagination.total,
  };
}
```

### Authentication

#### Login/OTP Response Changes

```typescript
// v1 Response
interface AuthResponseV1 {
  accessToken: string;
  refreshToken: string;
  user: UserV1;
  kycStatus: string;
}

// v2 Response
interface AuthResponseV2 {
  tokens: {
    access: string;
    refresh: string;
    expiresIn: number;  // seconds
  };
  user: UserV2;
  session: {
    id: string;
    deviceId: string;
    createdAt: string;
  };
  kyc: {
    status: string;
    tier: number;
    limits: {
      daily: number;
      monthly: number;
    };
  };
}
```

#### Migration Code

```typescript
// Before (v1)
async function loginV1(phone: string, otp: string) {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
  return response.data.user;
}

// After (v2)
async function loginV2(phone: string, otp: string) {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  const { tokens, user, session, kyc } = response.data;

  localStorage.setItem('accessToken', tokens.access);
  localStorage.setItem('refreshToken', tokens.refresh);
  localStorage.setItem('sessionId', session.id);

  // Schedule token refresh before expiry
  scheduleTokenRefresh(tokens.expiresIn);

  return { user, kyc };
}
```

### KYC Status

#### Response Changes

```typescript
// v1 Response
interface KycStatusV1 {
  status: string;
  score: number;
  submittedAt: string;
  approvedAt?: string;
  canResubmit: boolean;
}

// v2 Response
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
      daily: number;
      monthly: number;
    };
    documents: {
      idVerified: boolean;
      selfieVerified: boolean;
      addressVerified: boolean;
    };
    canResubmit: boolean;
    nextSteps?: string[];
  };
}
```

## Error Handling

### New Error Format

```typescript
// v1 Error
interface ErrorV1 {
  message: string;
  statusCode?: number;
  error?: string;
}

// v2 Error
interface ErrorV2 {
  error: {
    code: string;           // "INSUFFICIENT_BALANCE"
    message: string;        // User-friendly message
    details?: object;       // Additional context
    hint?: string;          // Suggested action
  };
  requestId: string;        // For support tickets
  timestamp: string;
}
```

### Error Code Mapping

| v1 Message                           | v2 Error Code            |
|--------------------------------------|--------------------------|
| "Invalid PIN"                        | `PIN_INVALID`            |
| "PIN is locked"                      | `PIN_LOCKED`             |
| "Insufficient balance"               | `INSUFFICIENT_BALANCE`   |
| "User not found"                     | `USER_NOT_FOUND`         |
| "Recipient not found"                | `RECIPIENT_NOT_FOUND`    |
| "Rate expired"                       | `RATE_EXPIRED`           |
| "Daily limit exceeded"               | `LIMIT_DAILY_EXCEEDED`   |
| "Monthly limit exceeded"             | `LIMIT_MONTHLY_EXCEEDED` |
| "KYC required"                       | `KYC_REQUIRED`           |
| "Invalid address"                    | `ADDRESS_INVALID`        |

### Error Handling Migration

```typescript
// Before (v1)
try {
  await transferV1(phone, amount);
} catch (error) {
  if (error.response?.data?.message === 'Invalid PIN') {
    showPinError();
  } else if (error.response?.data?.message === 'Insufficient balance') {
    showBalanceError();
  }
}

// After (v2)
try {
  await transferV2(phone, amount);
} catch (error) {
  const { code, hint } = error.response?.data?.error || {};

  switch (code) {
    case 'PIN_INVALID':
      showPinError(hint);
      break;
    case 'PIN_LOCKED':
      showLockoutError(error.response.data.error.details?.lockedUntil);
      break;
    case 'INSUFFICIENT_BALANCE':
      showBalanceError();
      break;
    case 'LIMIT_DAILY_EXCEEDED':
      showLimitError('daily', error.response.data.error.details?.limit);
      break;
    default:
      showGenericError(error.response.data.requestId);
  }
}
```

## New Headers

### Required Headers in v2

```http
# Recommended for all requests
X-Request-ID: <uuid>           # For request tracing
X-Client-Version: 2.1.0        # Mobile app version
X-Device-ID: <device-id>       # Device identifier

# For date-sensitive responses
X-Timezone: Africa/Abidjan     # Client timezone
```

### Rate Limit Headers

v2 returns rate limit information in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Removed Endpoints

These v1 endpoints have been removed in v2:

| Removed Endpoint           | Replacement                    |
|---------------------------|--------------------------------|
| GET /wallet/deposit/channels | GET /wallet/channels          |
| POST /wallet/kyc/submit    | POST /kyc/submit               |
| GET /wallet/kyc/status     | GET /kyc/status                |

## Testing Your Migration

### 1. Use v2 Sandbox

```
https://sandbox.api.joonapay.com/api/v2
```

### 2. Parallel Testing

Run v1 and v2 in parallel during migration:

```typescript
async function getBalanceWithFallback() {
  try {
    return await getBalanceV2();
  } catch (error) {
    console.warn('v2 failed, falling back to v1', error);
    return await getBalanceV1();
  }
}
```

### 3. Validate Response Formats

```typescript
import { z } from 'zod';

const BalanceV2Schema = z.object({
  walletId: z.string(),
  balances: z.array(z.object({
    currency: z.string(),
    available: z.number().int(),
    pending: z.number().int(),
    total: z.number().int(),
  })),
  limits: z.object({
    daily: z.number(),
    monthly: z.number(),
    remaining: z.object({
      daily: z.number(),
      monthly: z.number(),
    }),
  }),
});

const response = await api.get('/wallet');
const validated = BalanceV2Schema.parse(response.data);
```

## Checklist

- [ ] Update base URL to `/api/v2`
- [ ] Convert all amounts to/from cents
- [ ] Update request body structures
- [ ] Update response parsing
- [ ] Migrate from offset to page-based pagination
- [ ] Update error handling for new error format
- [ ] Add new required headers
- [ ] Test all endpoints in sandbox
- [ ] Update mobile SDK if applicable
- [ ] Monitor for deprecation warnings

## Support

Need help with migration?

- **Documentation**: https://docs.joonapay.com/v2
- **Migration Support**: migration@joonapay.com
- **Developer Discord**: https://discord.gg/joonapay
