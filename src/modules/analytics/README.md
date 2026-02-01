# Analytics Module

Provides spending insights and financial analytics for users based on their transaction history.

## Features

- **Spending by Category**: Breakdown of expenses by category (Bills, Transfers, Cash Out, etc.)
- **Income vs Expenses**: Summary of income, expenses, and net flow
- **Monthly Trends**: Month-by-month income and expense trends over time
- **Top Recipients**: Most frequent and highest-value transfer recipients

## API Endpoints

All endpoints require JWT authentication (`Authorization: Bearer <token>` header).

### GET /analytics/spending-by-category

Returns spending breakdown grouped by transaction category.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string (e.g., `2026-01-01T00:00:00.000Z`)
- `endDate` (optional): ISO 8601 date string (e.g., `2026-01-31T23:59:59.999Z`)
- `period` (optional): Pre-defined period - `week`, `month`, `quarter`, `year`

**Response:**
```json
{
  "categories": [
    {
      "category": "Bills",
      "amount": 450.75,
      "count": 15,
      "percentage": 45.5
    },
    {
      "category": "Transfers",
      "amount": 300.0,
      "count": 8,
      "percentage": 30.3
    }
  ],
  "totalSpent": 990.75,
  "period": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-31T23:59:59.999Z"
  }
}
```

### GET /analytics/income-vs-expenses

Returns income and expenses comparison with net flow.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `period` (optional): Pre-defined period

**Response:**
```json
{
  "income": 2500.0,
  "expenses": 990.75,
  "netFlow": 1509.25,
  "incomeTransactions": 5,
  "expenseTransactions": 26
}
```

### GET /analytics/monthly-trends

Returns monthly breakdown of income, expenses, and net flow.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `period` (optional): Pre-defined period

**Response:**
```json
{
  "trends": [
    {
      "month": "2025-11",
      "income": 800.0,
      "expenses": 320.5,
      "netFlow": 479.5,
      "transactionCount": 12
    },
    {
      "month": "2025-12",
      "income": 850.0,
      "expenses": 340.25,
      "netFlow": 509.75,
      "transactionCount": 14
    }
  ],
  "period": {
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2026-01-31T23:59:59.999Z"
  }
}
```

### GET /analytics/top-recipients

Returns top transfer recipients based on total amount sent.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `period` (optional): Pre-defined period

**Response:**
```json
{
  "recipients": [
    {
      "recipientName": "Amadou Diallo",
      "recipientPhone": "+225 07 12 34 56",
      "amount": 450.0,
      "count": 8,
      "lastTransactionDate": "2026-01-28T10:30:00.000Z"
    },
    {
      "recipientName": "Fatou Traoré",
      "recipientPhone": "+225 05 87 65 43",
      "amount": 280.0,
      "count": 5,
      "lastTransactionDate": "2026-01-25T14:20:00.000Z"
    }
  ],
  "period": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-31T23:59:59.999Z"
  }
}
```

## Default Behavior

If no date range or period is specified, the analytics default to the **last 3 months**.

## Category Detection

Categories are determined from transaction metadata when available. If not present, categories are inferred from transaction type:

- `withdrawal` → "Cash Out"
- `transfer_internal` → "Transfers"
- `transfer_external` → "External Transfers"
- `bill_payment` → "Bills"
- Other → "Other"

To set custom categories, include `category` in transaction metadata:

```json
{
  "metadata": {
    "category": "Groceries",
    "recipientName": "Supermarket ABC"
  }
}
```

## Architecture

```
analytics/
├── application/
│   ├── controllers/         # REST endpoints
│   ├── services/            # Business logic layer
│   └── dto/                 # Request/response DTOs
├── domain/
│   ├── entities/            # Analytics data structures
│   └── repositories/        # Repository interfaces
└── infrastructure/
    └── repositories/        # TypeORM implementation
```

## Dependencies

- **TransactionModule**: Queries completed transactions
- **WalletModule**: Resolves user wallet IDs

## Performance Notes

- All queries filter by `status = 'completed'` to exclude pending/failed transactions
- Indexes on `wallet_id`, `status`, and `created_at` optimize query performance
- Monthly trends use PostgreSQL's `TO_CHAR` function for efficient grouping
- Top recipients limited to 10 results to prevent large response payloads

## Future Enhancements

- [ ] Merchant categorization (e.g., "Restaurants", "Utilities")
- [ ] Budget tracking and alerts
- [ ] Spending predictions based on historical patterns
- [ ] Export analytics as PDF/CSV
- [ ] Comparative analytics (vs. previous period)
