# Wallet API Migration Guide (v1 to v2)

This guide covers all changes to wallet endpoints between API v1 and v2.

## Summary of Changes

| Aspect              | v1                        | v2                               |
|---------------------|---------------------------|----------------------------------|
| Amount format       | Float (dollars)           | Integer (cents)                  |
| Balance structure   | Single balance object     | Array of balances with limits    |
| Transfer request    | Flat structure            | Nested recipient/amount objects  |
| Deposit response    | Flat structure            | Nested structured response       |
| Fee breakdown       | Single fee value          | Itemized fee breakdown           |

## Endpoints

### GET /wallet (Balance)

#### Response Changes

```typescript
// v1 Response
interface BalanceV1 {
  walletId: string;
  currency: string;           // "USD"
  balances: Array<{
    currency: string;
    available: number;        // 100.50 (dollars)
    pending: number;
    total: number;
  }>;
}

// v2 Response
interface BalanceV2 {
  wallet: {
    id: string;
    status: 'active' | 'suspended' | 'closed';
    createdAt: string;
  };
  balances: Array<{
    currency: string;         // "USDC"
    available: number;        // 10050 (cents)
    pending: number;          // 0
    reserved: number;         // For scheduled payments
    total: number;            // 10050
  }>;
  limits: {
    tier: 1 | 2 | 3;
    daily: {
      limit: number;
      used: number;
      remaining: number;
      resetsAt: string;
    };
    monthly: {
      limit: number;
      used: number;
      remaining: number;
      resetsAt: string;
    };
    perTransaction: number;
  };
  address: {
    blockchain: string;       // "polygon"
    address: string;          // "0x..."
    qrCode?: string;          // Base64 QR code
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function getBalanceV1() {
  const response = await api.get('/wallet');
  const usdBalance = response.data.balances.find(b => b.currency === 'USD');
  return {
    available: usdBalance?.available || 0,
    pending: usdBalance?.pending || 0,
  };
}

// After (v2)
async function getBalanceV2() {
  const response = await api.get('/wallet');
  const { balances, limits, address } = response.data;
  const usdcBalance = balances.find(b => b.currency === 'USDC');

  return {
    available: (usdcBalance?.available || 0) / 100,  // Convert cents to dollars
    pending: (usdcBalance?.pending || 0) / 100,
    reserved: (usdcBalance?.reserved || 0) / 100,
    dailyRemaining: limits.daily.remaining / 100,
    monthlyRemaining: limits.monthly.remaining / 100,
    depositAddress: address.address,
  };
}
```

### POST /wallet/create

#### Response Changes

```typescript
// v1 Response
interface CreateWalletV1 {
  id: string;
  userId: string;
  circleWalletId: string;
  circleWalletAddress: string;
  currency: string;
  balance: number;
  status: string;
}

// v2 Response
interface CreateWalletV2 {
  wallet: {
    id: string;
    userId: string;
    status: 'active';
    createdAt: string;
  };
  blockchain: {
    provider: string;         // "circle"
    walletId: string;
    address: string;
    network: string;          // "polygon"
    explorerUrl: string;
  };
  balance: {
    currency: string;
    available: number;        // 0
  };
  nextSteps: string[];        // ["Complete KYC", "Set PIN"]
}
```

### POST /wallet/transfer/internal

#### Request Changes

```typescript
// v1 Request
interface InternalTransferRequestV1 {
  toPhone: string;            // "+2250701234567"
  amount: number;             // 50.00 (dollars)
  currency: string;           // "USD"
}

// v2 Request
interface InternalTransferRequestV2 {
  recipient: {
    type: 'phone' | 'username' | 'walletId' | 'email';
    value: string;            // "+2250701234567" or "@johndoe"
  };
  amount: {
    value: number;            // 5000 (cents)
    currency: string;         // "USDC"
  };
  note?: string;
  metadata?: {
    category?: string;        // "food", "transport", etc.
    reference?: string;
  };
  scheduling?: {
    executeAt?: string;       // ISO date for scheduled transfer
  };
}
```

#### Response Changes

```typescript
// v1 Response
interface InternalTransferResponseV1 {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  toPhone: string;
  amount: number;             // 50.00
  currency: string;
  fee: number;                // 0.00
  status: string;
}

// v2 Response
interface InternalTransferResponseV2 {
  transfer: {
    id: string;
    reference: string;        // "INT-ABC123XY"
    type: 'internal';
    status: {
      code: 'pending' | 'processing' | 'completed' | 'failed' | 'scheduled';
      message?: string;
      updatedAt: string;
    };
    sender: {
      walletId: string;
      userId: string;
      displayName?: string;
    };
    recipient: {
      walletId: string;
      userId: string;
      phone?: string;
      username?: string;
      displayName?: string;
    };
    amount: {
      value: number;          // 5000 (cents)
      currency: string;
    };
    fee: {
      value: number;          // 0
      currency: string;
      waived: boolean;
      reason?: string;        // "P2P transfers are free"
    };
    note?: string;
    timestamps: {
      created: string;
      scheduled?: string;
      processing?: string;
      completed?: string;
    };
    receipt?: {
      available: boolean;
      url?: string;
    };
  };
  balance: {
    available: number;        // Updated balance after transfer
    currency: string;
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function sendMoneyV1(phone: string, amount: number, note?: string) {
  const pinToken = await getPinToken();

  const response = await api.post('/wallet/transfer/internal', {
    toPhone: phone,
    amount: amount,           // 50.00
    currency: 'USD',
  }, {
    headers: {
      'X-Pin-Token': pinToken,
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
  });

  return {
    id: response.data.transactionId,
    status: response.data.status,
  };
}

// After (v2)
async function sendMoneyV2(phone: string, amountDollars: number, note?: string) {
  const authorization = await getPinAuthorization();

  const response = await api.post('/wallet/transfer/internal', {
    recipient: {
      type: 'phone',
      value: phone,
    },
    amount: {
      value: Math.round(amountDollars * 100),  // Convert to cents
      currency: 'USDC',
    },
    note: note,
  }, {
    headers: {
      'X-Pin-Token': authorization.token,
      'X-Device-ID': getDeviceId(),
      'X-Request-ID': generateRequestId(),
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
  });

  const { transfer, balance } = response.data;
  return {
    id: transfer.id,
    reference: transfer.reference,
    status: transfer.status.code,
    recipientName: transfer.recipient.displayName,
    newBalance: balance.available / 100,
  };
}
```

### POST /wallet/transfer/external

#### Request Changes

```typescript
// v1 Request
interface ExternalTransferRequestV1 {
  toAddress: string;
  amount: number;             // 50.00 (dollars)
  currency: string;
  network: string;            // "polygon"
}

// v2 Request
interface ExternalTransferRequestV2 {
  destination: {
    address: string;
    network: 'polygon' | 'ethereum' | 'solana' | 'base';
    label?: string;           // "My MetaMask"
    saveAsBeneficiary?: boolean;
  };
  amount: {
    value: number;            // 5000 (cents)
    currency: string;
  };
  note?: string;
  priority?: 'standard' | 'fast';  // Affects network fee
}
```

#### Response Changes

```typescript
// v1 Response
interface ExternalTransferResponseV1 {
  transactionId: string;
  walletId: string;
  toAddress: string;
  amount: number;
  currency: string;
  fee: number;
  status: string;
  estimatedArrival: string;
}

// v2 Response
interface ExternalTransferResponseV2 {
  transfer: {
    id: string;
    reference: string;        // "EXT-XYZ789AB"
    type: 'external';
    status: {
      code: 'pending' | 'processing' | 'confirming' | 'completed' | 'failed';
      confirmations?: number;
      requiredConfirmations?: number;
      updatedAt: string;
    };
    sender: {
      walletId: string;
    };
    destination: {
      address: string;
      network: string;
      explorerUrl: string;    // Link to block explorer
    };
    amount: {
      value: number;          // 5000 (cents)
      currency: string;
    };
    fee: {
      platform: {
        value: number;
        currency: string;
      };
      network: {
        value: number;        // Gas fee
        currency: string;     // Native token
      };
      total: {
        value: number;
        currency: string;
      };
    };
    timeline: {
      estimated: string;      // "5-30 minutes"
      estimatedAt: string;    // ISO date
    };
    blockchain?: {
      txHash?: string;
      blockNumber?: number;
    };
    timestamps: {
      created: string;
      submitted?: string;
      confirmed?: string;
    };
  };
  balance: {
    available: number;
    currency: string;
  };
}
```

### POST /wallet/withdraw

This is an alias for `/wallet/transfer/external` with a simpler interface.

#### Request (v2 Only)

```typescript
interface WithdrawRequestV2 {
  destination: {
    address: string;
    network: string;
  };
  amount: {
    value: number;            // Cents
    currency: string;
  };
}
```

### GET /wallet/rate

#### Request Changes

```http
# v1
GET /wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000

# v2
GET /wallet/rate?source[currency]=XOF&source[amount]=10000&target[currency]=USDC&direction=deposit
```

#### Response Changes

```typescript
// v1 Response
interface RateResponseV1 {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;               // 0.00166
  sourceAmount: number;
  targetAmount: number;
  fee: number;
  expiresAt: string;
}

// v2 Response
interface RateResponseV2 {
  quote: {
    id: string;               // Quote ID for locking rate
    direction: 'deposit' | 'withdraw';
    source: {
      currency: string;
      amount: number;         // Original amount
    };
    target: {
      currency: string;
      amount: number;         // Converted amount
    };
    rate: {
      value: number;
      inverse: number;        // 1/rate
      provider: string;
      timestamp: string;
    };
    fees: {
      items: Array<{
        type: 'exchange' | 'network' | 'platform';
        value: number;
        currency: string;
        description: string;
      }>;
      total: {
        value: number;
        currency: string;
      };
    };
    breakdown: {
      youPay: number;
      youReceive: number;
      feePercentage: number;
    };
    validity: {
      expiresAt: string;
      remainingSeconds: number;
    };
  };
}
```

### POST /wallet/deposit

#### Request Changes

```typescript
// v1 Request
interface DepositRequestV1 {
  amount: number;             // 10000 (XOF)
  sourceCurrency: string;
  channelId: string;
}

// v2 Request
interface DepositRequestV2 {
  source: {
    amount: number;           // 10000
    currency: string;         // "XOF"
  };
  channel: {
    id: string;               // "orange_money_ci"
    provider?: string;
  };
  quoteId?: string;           // Lock in a specific rate
  metadata?: {
    purpose?: string;
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
    reference: string;        // "DEP-ABC123XY"
    status: 'pending_payment' | 'processing' | 'completed' | 'expired' | 'failed';
    source: {
      amount: number;
      currency: string;
      channel: {
        id: string;
        name: string;
        provider: string;
        logo?: string;
      };
    };
    target: {
      amount: number;         // Expected USDC amount (cents)
      currency: string;
    };
    rate: {
      value: number;
      lockedAt: string;
      expiresAt: string;
    };
    fees: {
      items: Array<{
        type: string;
        value: number;
        currency: string;
      }>;
      total: {
        value: number;
        currency: string;
      };
    };
    instructions: {
      type: 'mobile_money' | 'bank_transfer' | 'card';
      provider: {
        name: string;
        logo?: string;
      };
      payment: {
        accountNumber?: string;
        accountName?: string;
        reference: string;
        ussdCode?: string;    // For mobile money
      };
      steps: Array<{
        order: number;
        instruction: string;
        note?: string;
      }>;
      qrCode?: string;        // Base64 QR code if applicable
    };
    timeline: {
      expiresAt: string;
      remainingSeconds: number;
      processingTime: string; // "Usually within 5 minutes"
    };
    timestamps: {
      created: string;
    };
  };
  wallet: {
    currentBalance: number;
    expectedBalance: number;  // After deposit completes
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function initiateDepositV1(amount: number, channelId: string) {
  const response = await api.post('/wallet/deposit', {
    amount: amount,           // 10000 XOF
    sourceCurrency: 'XOF',
    channelId: channelId,
  }, {
    headers: {
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
  });

  return {
    depositId: response.data.depositId,
    payTo: response.data.paymentInstructions.accountNumber,
    reference: response.data.paymentInstructions.reference,
    instructions: response.data.paymentInstructions.instructions,
    expiresAt: response.data.expiresAt,
    estimatedUsdc: response.data.estimatedAmount,
  };
}

// After (v2)
async function initiateDepositV2(amount: number, channelId: string) {
  // Optionally get a quote first to lock the rate
  const quoteResponse = await api.get('/wallet/rate', {
    params: {
      'source[currency]': 'XOF',
      'source[amount]': amount,
      'target[currency]': 'USDC',
      direction: 'deposit',
    },
  });

  const response = await api.post('/wallet/deposit', {
    source: {
      amount: amount,
      currency: 'XOF',
    },
    channel: {
      id: channelId,
    },
    quoteId: quoteResponse.data.quote.id,  // Lock the rate
  }, {
    headers: {
      'X-Request-ID': generateRequestId(),
      'X-Idempotency-Key': generateIdempotencyKey(),
    },
  });

  const { deposit, wallet } = response.data;
  return {
    depositId: deposit.id,
    reference: deposit.reference,
    payTo: deposit.instructions.payment.accountNumber,
    paymentReference: deposit.instructions.payment.reference,
    ussdCode: deposit.instructions.payment.ussdCode,
    steps: deposit.instructions.steps,
    qrCode: deposit.instructions.qrCode,
    expiresAt: deposit.timeline.expiresAt,
    remainingSeconds: deposit.timeline.remainingSeconds,
    estimatedUsdc: deposit.target.amount / 100,
    feeBreakdown: deposit.fees.items,
    expectedBalance: wallet.expectedBalance / 100,
  };
}
```

### GET /wallet/channels (New in v2)

Replaces `/wallet/deposit/channels`.

```typescript
interface ChannelsResponseV2 {
  channels: Array<{
    id: string;
    name: string;
    type: 'mobile_money' | 'bank_transfer' | 'card';
    provider: {
      id: string;
      name: string;
      logo: string;
    };
    country: string;
    currency: string;
    limits: {
      min: number;
      max: number;
      currency: string;
    };
    fees: {
      type: 'percentage' | 'fixed' | 'tiered';
      value?: number;
      tiers?: Array<{ min: number; max: number; fee: number; }>;
    };
    availability: {
      enabled: boolean;
      schedule?: string;      // "24/7" or "Mon-Fri 8AM-6PM"
      maintenanceUntil?: string;
    };
    processingTime: string;   // "Instant" or "1-2 business days"
    popular: boolean;
  }>;
  recommended?: string;       // Channel ID based on user's profile
}
```

### POST /wallet/transfer/preview (New in v2)

Preview a transfer before execution.

```typescript
// Request
interface TransferPreviewRequest {
  recipient: {
    type: 'phone' | 'username' | 'address';
    value: string;
  };
  amount: {
    value: number;
    currency: string;
  };
}

// Response
interface TransferPreviewResponse {
  preview: {
    valid: boolean;
    recipient: {
      found: boolean;
      type: string;
      displayName?: string;
      avatar?: string;
    };
    amount: {
      value: number;
      currency: string;
      formatted: string;      // "$50.00"
    };
    fee: {
      value: number;
      currency: string;
      waived: boolean;
      reason?: string;
    };
    total: {
      value: number;
      currency: string;
      formatted: string;
    };
    balance: {
      current: number;
      afterTransfer: number;
      sufficient: boolean;
    };
    limits: {
      withinDaily: boolean;
      withinMonthly: boolean;
      dailyRemaining: number;
    };
    warnings?: string[];      // ["Recipient has not completed KYC"]
    blockers?: string[];      // ["Insufficient balance"]
  };
}
```

## Amount Conversion Helpers

```typescript
// Utility functions for amount conversion
const AmountUtils = {
  toCents: (dollars: number): number => Math.round(dollars * 100),
  toDollars: (cents: number): number => cents / 100,

  formatCurrency: (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USDC' ? 'USD' : currency,
    }).format(cents / 100);
  },

  parseDisplayAmount: (display: string): number => {
    // Remove currency symbols and convert to cents
    const cleaned = display.replace(/[^0-9.-]/g, '');
    return Math.round(parseFloat(cleaned) * 100);
  },
};

// Usage
const amountInCents = AmountUtils.toCents(50.00);  // 5000
const amountInDollars = AmountUtils.toDollars(5000);  // 50.00
const formatted = AmountUtils.formatCurrency(5000);  // "$50.00"
```

## Error Codes

| v1 Message                 | v2 Error Code               |
|----------------------------|-----------------------------|
| "Insufficient balance"     | `WALLET_INSUFFICIENT_BALANCE` |
| "Wallet not found"         | `WALLET_NOT_FOUND`          |
| "Wallet suspended"         | `WALLET_SUSPENDED`          |
| "Daily limit exceeded"     | `LIMIT_DAILY_EXCEEDED`      |
| "Monthly limit exceeded"   | `LIMIT_MONTHLY_EXCEEDED`    |
| "Transfer limit exceeded"  | `LIMIT_PER_TRANSACTION`     |
| "Recipient not found"      | `RECIPIENT_NOT_FOUND`       |
| "Cannot transfer to self"  | `TRANSFER_SELF_NOT_ALLOWED` |
| "Rate expired"             | `QUOTE_EXPIRED`             |
| "Invalid address"          | `ADDRESS_INVALID`           |
| "Address not supported"    | `ADDRESS_NETWORK_UNSUPPORTED` |
| "Channel unavailable"      | `CHANNEL_UNAVAILABLE`       |

## Checklist

- [ ] Update all amount handling to use cents
- [ ] Update balance parsing for new structure
- [ ] Update transfer requests with nested objects
- [ ] Update deposit flow with new response format
- [ ] Implement transfer preview before sensitive operations
- [ ] Add amount conversion utilities
- [ ] Update error handling for new codes
- [ ] Test with edge cases (very small/large amounts)
- [ ] Verify fee breakdown displays correctly
