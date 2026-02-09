# Transaction API Migration Guide (v1 to v2)

This guide covers all changes to transaction and transfer history endpoints between API v1 and v2.

## Summary of Changes

| Aspect              | v1                        | v2                               |
|---------------------|---------------------------|----------------------------------|
| Pagination          | Offset-based              | Page-based                       |
| Filtering           | Flat query params         | Nested `filter[]` params         |
| Sorting             | Not supported             | `sort` and `order` params        |
| Amount format       | Float (dollars)           | Integer (cents)                  |
| Response structure  | `transactions` array      | `data` array with `pagination`   |

## Endpoints

### GET /wallet/transactions

#### Query Parameter Changes

```http
# v1
GET /wallet/transactions?limit=20&offset=40&type=deposit&status=completed&startDate=2026-01-01&endDate=2026-01-31

# v2
GET /wallet/transactions?page=3&limit=20&filter[type]=deposit&filter[status]=completed&filter[dateFrom]=2026-01-01&filter[dateTo]=2026-01-31&sort=createdAt&order=desc
```

#### Parameter Mapping

| v1 Parameter | v2 Parameter        | Notes                               |
|--------------|---------------------|-------------------------------------|
| `limit`      | `limit`             | Default changed from 20 to 25       |
| `offset`     | `page`              | `page = (offset / limit) + 1`       |
| `type`       | `filter[type]`      | Same values                         |
| `status`     | `filter[status]`    | Same values                         |
| `startDate`  | `filter[dateFrom]`  | Renamed                             |
| `endDate`    | `filter[dateTo]`    | Renamed                             |
| `minAmount`  | `filter[amountMin]` | Now in cents                        |
| `maxAmount`  | `filter[amountMax]` | Now in cents                        |
| `search`     | `filter[search]`    | Searches reference, note, recipient |
| -            | `sort`              | New: `createdAt`, `amount`, `type`  |
| -            | `order`             | New: `asc`, `desc`                  |
| -            | `filter[currency]`  | New: filter by currency             |

#### Response Changes

```typescript
// v1 Response
interface TransactionsResponseV1 {
  transactions: Array<{
    id: string;
    walletId: string;
    type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
    amount: number;           // 50.00 (dollars)
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
    metadata?: object;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// v2 Response
interface TransactionsResponseV2 {
  data: Array<{
    id: string;
    reference: string;        // "TXN-ABC123"
    type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee' | 'refund';
    category?: string;        // "p2p", "bill_payment", etc.
    amount: {
      value: number;          // 5000 (cents)
      currency: string;
      formatted: string;      // "$50.00"
    };
    balance: {
      before: number;
      after: number;
    };
    counterparty?: {
      type: 'user' | 'merchant' | 'external';
      id?: string;
      name?: string;
      phone?: string;
      address?: string;
      avatar?: string;
    };
    status: {
      code: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
      reason?: string;
      updatedAt: string;
    };
    fee?: {
      value: number;
      currency: string;
    };
    note?: string;
    tags?: string[];
    metadata?: {
      provider?: string;
      providerRef?: string;
      [key: string]: any;
    };
    timestamps: {
      created: string;
      updated: string;
      completed?: string;
    };
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
    filters: {
      applied: object;
      available: {
        types: string[];
        statuses: string[];
      };
    };
  };
  summary?: {
    period: {
      from: string;
      to: string;
    };
    totals: {
      incoming: number;
      outgoing: number;
      fees: number;
      net: number;
    };
  };
}
```

#### Migration Example

```typescript
// Before (v1)
interface TransactionFilters {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

async function getTransactionsV1(
  offset: number,
  limit: number,
  filters: TransactionFilters
) {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });

  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const response = await api.get(`/wallet/transactions?${params}`);

  return {
    transactions: response.data.transactions,
    total: response.data.total,
    hasMore: response.data.hasMore,
    nextOffset: offset + limit,
  };
}

// After (v2)
interface TransactionFiltersV2 {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;  // In cents
  amountMax?: number;  // In cents
  search?: string;
}

async function getTransactionsV2(
  page: number,
  limit: number,
  filters: TransactionFiltersV2,
  sort: { field: string; order: 'asc' | 'desc' } = { field: 'createdAt', order: 'desc' }
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sort.field,
    order: sort.order,
  });

  // Add filters with proper nesting
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(`filter[${key}]`, value.toString());
    }
  });

  const response = await api.get(`/wallet/transactions?${params}`);
  const { data, pagination, meta, summary } = response.data;

  return {
    transactions: data.map(tx => ({
      ...tx,
      amountDollars: tx.amount.value / 100,
      displayAmount: tx.amount.formatted,
    })),
    pagination: {
      page: pagination.page,
      totalPages: pagination.totalPages,
      total: pagination.total,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
    summary: summary ? {
      ...summary,
      totals: {
        incoming: summary.totals.incoming / 100,
        outgoing: summary.totals.outgoing / 100,
        fees: summary.totals.fees / 100,
        net: summary.totals.net / 100,
      },
    } : undefined,
  };
}
```

### GET /wallet/transactions/:id

#### Response Changes

```typescript
// v1 Response
interface TransactionDetailV1 {
  id: string;
  walletId: string;
  type: string;
  amount: number;             // 50.00 (dollars)
  currency: string;
  status: string;
  yellowCardRef?: string;
  metadata?: {
    sourceCurrency?: string;
    sourceAmount?: number;
    rate?: number;
    fee?: number;
  };
  createdAt: string;
  completedAt?: string;
}

// v2 Response
interface TransactionDetailV2 {
  transaction: {
    id: string;
    reference: string;
    type: string;
    category?: string;
    description: string;      // Human-readable description

    amount: {
      value: number;
      currency: string;
      formatted: string;
      original?: {            // For conversions
        value: number;
        currency: string;
      };
    };

    balance: {
      before: number;
      after: number;
      currency: string;
    };

    counterparty?: {
      type: 'user' | 'merchant' | 'external' | 'system';
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      avatar?: string;
      verified?: boolean;
    };

    status: {
      code: string;
      label: string;          // "Completed"
      description?: string;   // "Transfer completed successfully"
      updatedAt: string;
      history: Array<{
        status: string;
        timestamp: string;
        note?: string;
      }>;
    };

    fees: {
      items: Array<{
        type: 'platform' | 'network' | 'exchange' | 'processing';
        value: number;
        currency: string;
        description: string;
      }>;
      total: {
        value: number;
        currency: string;
      };
      waived?: {
        value: number;
        reason: string;
      };
    };

    exchange?: {
      rate: number;
      inverseRate: number;
      provider: string;
      lockedAt: string;
    };

    blockchain?: {
      network: string;
      txHash?: string;
      blockNumber?: number;
      confirmations?: number;
      explorerUrl?: string;
    };

    note?: string;
    tags?: string[];
    attachments?: Array<{
      type: 'receipt' | 'invoice';
      url: string;
    }>;

    timestamps: {
      created: string;
      updated: string;
      processing?: string;
      completed?: string;
      failed?: string;
    };

    actions: {
      canCancel: boolean;
      canRefund: boolean;
      canDispute: boolean;
      canDownloadReceipt: boolean;
    };
  };

  related?: Array<{           // Related transactions (refunds, fees, etc.)
    id: string;
    type: string;
    amount: number;
    relationship: 'refund' | 'fee' | 'reversal';
  }>;
}
```

#### Migration Example

```typescript
// Before (v1)
async function getTransactionDetailsV1(id: string) {
  const response = await api.get(`/wallet/transactions/${id}`);
  const tx = response.data;

  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    date: tx.createdAt,
    fee: tx.metadata?.fee || 0,
  };
}

// After (v2)
async function getTransactionDetailsV2(id: string) {
  const response = await api.get(`/wallet/transactions/${id}`);
  const { transaction, related } = response.data;

  return {
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount.value / 100,
    formattedAmount: transaction.amount.formatted,
    status: transaction.status.code,
    statusLabel: transaction.status.label,
    statusHistory: transaction.status.history,

    // Counterparty info
    counterparty: transaction.counterparty ? {
      name: transaction.counterparty.name || 'Unknown',
      type: transaction.counterparty.type,
      avatar: transaction.counterparty.avatar,
    } : null,

    // Fee breakdown
    fees: {
      items: transaction.fees.items,
      total: transaction.fees.total.value / 100,
    },

    // Exchange info (for deposits/withdrawals)
    exchange: transaction.exchange,

    // Blockchain info (for external transfers)
    blockchain: transaction.blockchain ? {
      network: transaction.blockchain.network,
      txHash: transaction.blockchain.txHash,
      explorerUrl: transaction.blockchain.explorerUrl,
      confirmations: `${transaction.blockchain.confirmations}/${transaction.blockchain.requiredConfirmations || 12}`,
    } : null,

    // Timestamps
    createdAt: transaction.timestamps.created,
    completedAt: transaction.timestamps.completed,

    // Available actions
    actions: transaction.actions,

    // Related transactions
    refunds: related?.filter(r => r.relationship === 'refund') || [],
  };
}
```

### GET /transfers (Transfer History)

#### Response Changes

```typescript
// v1 Response
interface TransfersResponseV1 {
  transfers: Array<{
    id: string;
    reference: string;
    type: 'internal' | 'external';
    status: string;
    senderId: string;
    senderWalletId: string;
    recipientId?: string;
    recipientWalletId?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    amount: number;           // 50.00 (dollars)
    fee: number;
    totalAmount: number;
    currency: string;
    note?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}

// v2 Response
interface TransfersResponseV2 {
  data: Array<{
    id: string;
    reference: string;
    type: 'internal' | 'external';

    status: {
      code: string;
      label: string;
      updatedAt: string;
    };

    direction: 'sent' | 'received';

    sender: {
      id: string;
      walletId: string;
      name?: string;
      phone?: string;
      isMe: boolean;
    };

    recipient: {
      id?: string;
      walletId?: string;
      name?: string;
      phone?: string;
      username?: string;
      address?: string;
      network?: string;
      isMe: boolean;
    };

    amount: {
      value: number;          // 5000 (cents)
      currency: string;
      formatted: string;
    };

    fee: {
      value: number;
      currency: string;
    };

    total: {
      value: number;
      currency: string;
      formatted: string;
    };

    note?: string;
    category?: string;

    timestamps: {
      created: string;
      scheduled?: string;
      completed?: string;
    };

    receipt?: {
      available: boolean;
      url?: string;
    };
  }>;

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  summary: {
    period: string;
    sent: {
      count: number;
      total: number;
    };
    received: {
      count: number;
      total: number;
    };
  };
}
```

### GET /transfers/:id

#### Response Changes

Similar to transaction detail, with additional transfer-specific fields:

```typescript
interface TransferDetailV2 {
  transfer: {
    // All transaction fields plus:
    scheduling?: {
      type: 'immediate' | 'scheduled' | 'recurring';
      scheduledFor?: string;
      recurringRule?: string;
    };
    compliance?: {
      riskScore?: number;
      reviewStatus?: string;
      flags?: string[];
    };
    notifications: {
      recipientNotified: boolean;
      channels: string[];
    };
  };
}
```

### GET /transfers/:id/receipt (New in v2)

Generate a transfer receipt.

```typescript
// Response
interface ReceiptResponse {
  receipt: {
    id: string;
    transferId: string;
    format: 'pdf' | 'png';
    url: string;              // Signed URL, expires in 1 hour
    expiresAt: string;
    size: number;             // Bytes
  };
}
```

## Pagination Migration

### Converting Offset to Page

```typescript
// Migration helper
function offsetToPage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

function pageToOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

// Example: offset=40, limit=20 -> page=3
// Example: page=3, limit=20 -> offset=40
```

### Implementing Infinite Scroll with v2

```typescript
// v1 Infinite Scroll
class TransactionListV1 {
  private offset = 0;
  private limit = 20;
  private hasMore = true;

  async loadMore() {
    if (!this.hasMore) return;

    const response = await api.get('/wallet/transactions', {
      params: { offset: this.offset, limit: this.limit },
    });

    this.offset += this.limit;
    this.hasMore = response.data.hasMore;
    return response.data.transactions;
  }
}

// v2 Infinite Scroll
class TransactionListV2 {
  private page = 1;
  private limit = 25;
  private hasNext = true;

  async loadMore() {
    if (!this.hasNext) return;

    const response = await api.get('/wallet/transactions', {
      params: { page: this.page, limit: this.limit },
    });

    this.page++;
    this.hasNext = response.data.pagination.hasNext;

    return response.data.data.map(tx => ({
      ...tx,
      amount: tx.amount.value / 100,  // Convert cents to dollars
    }));
  }

  // New in v2: Jump to specific page
  async goToPage(page: number) {
    this.page = page;
    return this.loadMore();
  }

  // New in v2: Get total count without loading all data
  async getTotalCount() {
    const response = await api.get('/wallet/transactions', {
      params: { page: 1, limit: 1 },
    });
    return response.data.pagination.total;
  }
}
```

## Filtering and Sorting

### Building Filter Queries

```typescript
// Filter builder for v2
class TransactionFilterBuilder {
  private filters: Record<string, string> = {};
  private sortField = 'createdAt';
  private sortOrder: 'asc' | 'desc' = 'desc';

  type(type: string) {
    this.filters['filter[type]'] = type;
    return this;
  }

  status(status: string) {
    this.filters['filter[status]'] = status;
    return this;
  }

  dateRange(from: Date, to: Date) {
    this.filters['filter[dateFrom]'] = from.toISOString().split('T')[0];
    this.filters['filter[dateTo]'] = to.toISOString().split('T')[0];
    return this;
  }

  amountRange(minDollars: number, maxDollars: number) {
    this.filters['filter[amountMin]'] = (minDollars * 100).toString();
    this.filters['filter[amountMax]'] = (maxDollars * 100).toString();
    return this;
  }

  search(query: string) {
    this.filters['filter[search]'] = query;
    return this;
  }

  sortBy(field: string, order: 'asc' | 'desc' = 'desc') {
    this.sortField = field;
    this.sortOrder = order;
    return this;
  }

  build() {
    return {
      ...this.filters,
      sort: this.sortField,
      order: this.sortOrder,
    };
  }
}

// Usage
const filters = new TransactionFilterBuilder()
  .type('deposit')
  .status('completed')
  .dateRange(new Date('2026-01-01'), new Date('2026-01-31'))
  .amountRange(10, 100)
  .sortBy('amount', 'desc')
  .build();

const response = await api.get('/wallet/transactions', { params: filters });
```

## Error Handling

### Transaction Error Codes

| v1 Message                 | v2 Error Code                |
|----------------------------|------------------------------|
| "Transaction not found"    | `TRANSACTION_NOT_FOUND`      |
| "Access denied"            | `TRANSACTION_ACCESS_DENIED`  |
| "Invalid filter"           | `FILTER_INVALID`             |
| "Invalid date range"       | `FILTER_DATE_RANGE_INVALID`  |
| "Page out of range"        | `PAGINATION_OUT_OF_RANGE`    |

## Performance Tips

### Requesting Only Needed Fields

v2 supports field selection to reduce payload size:

```http
GET /wallet/transactions?page=1&fields=id,reference,amount,status,createdAt
```

### Using Summary Instead of Loading All

For analytics, use the summary endpoint instead of loading all transactions:

```http
GET /wallet/transactions/summary?period=month&groupBy=type
```

## Checklist

- [ ] Convert offset-based pagination to page-based
- [ ] Update filter parameter names with `filter[]` prefix
- [ ] Add sort and order parameters where needed
- [ ] Update amount parsing from dollars to cents
- [ ] Update response parsing for nested structure
- [ ] Implement pagination controls for new format
- [ ] Add support for transaction summaries
- [ ] Update infinite scroll implementations
- [ ] Handle new status history format
- [ ] Test filter combinations
