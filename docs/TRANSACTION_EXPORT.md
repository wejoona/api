# Transaction Export Feature

## Overview

The transaction export feature allows users to download their transaction history in CSV or JSON format for record-keeping, accounting, and reconciliation purposes.

## API Endpoint

```
GET /api/v1/wallet/export/transactions
```

### Authentication

Requires JWT authentication via Bearer token.

```
Authorization: Bearer <your-jwt-token>
```

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date for export (ISO 8601) | `2026-01-01` |
| `endDate` | string | No | End date for export (ISO 8601) | `2026-01-31` |
| `format` | string | No | Export format: `csv` or `json` | `csv` |

### Response Formats

#### CSV Format (default)

Returns a downloadable CSV file with the following columns:

- **Date**: ISO 8601 timestamp of transaction
- **Type**: Transaction type (deposit, withdrawal, etc.)
- **Description**: Human-readable description
- **Amount**: Transaction amount
- **Currency**: Currency code (USD, XOF, etc.)
- **Status**: Transaction status
- **Reference**: External reference or transaction ID
- **Completed At**: Completion timestamp (if applicable)

**Example CSV:**
```csv
Date,Type,Description,Amount,Currency,Status,Reference,Completed At
2026-01-18T12:00:00.000Z,deposit,Deposit (On-ramp),16.45,USD,completed,yc_dep_1234567890,2026-01-18T12:05:00.000Z
2026-01-19T15:30:00.000Z,internal_transfer,Transfer to User,-10.00,USD,completed,550e8400-e29b-41d4-a716-446655440000,2026-01-19T15:30:01.000Z
```

#### JSON Format

Returns structured JSON data with metadata and transaction array.

**Example JSON:**
```json
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "exportDate": "2026-01-25T10:00:00.000Z",
  "startDate": null,
  "endDate": null,
  "totalTransactions": 2,
  "transactions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2026-01-18T12:00:00.000Z",
      "type": "deposit",
      "amount": 16.45,
      "currency": "USD",
      "status": "completed",
      "reference": "yc_dep_1234567890",
      "description": "Deposit (On-ramp)",
      "completedAt": "2026-01-18T12:05:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-01-19T15:30:00.000Z",
      "type": "internal_transfer",
      "amount": -10.00,
      "currency": "USD",
      "status": "completed",
      "reference": "550e8400-e29b-41d4-a716-446655440000",
      "description": "Transfer to User",
      "completedAt": "2026-01-19T15:30:01.000Z"
    }
  ]
}
```

## Usage Examples

### Export All Transactions (CSV)

```bash
curl -X GET "http://localhost:3000/api/v1/wallet/export/transactions?format=csv" \
  -H "Authorization: Bearer your-jwt-token" \
  --output transactions.csv
```

### Export Date Range (JSON)

```bash
curl -X GET "http://localhost:3000/api/v1/wallet/export/transactions?startDate=2026-01-01&endDate=2026-01-31&format=json" \
  -H "Authorization: Bearer your-jwt-token"
```

### Export Recent Transactions (CSV)

```bash
curl -X GET "http://localhost:3000/api/v1/wallet/export/transactions?startDate=2026-01-01" \
  -H "Authorization: Bearer your-jwt-token" \
  --output recent-transactions.csv
```

### Using JavaScript/TypeScript

```typescript
const token = 'your-jwt-token';
const startDate = '2026-01-01';
const endDate = '2026-01-31';

// Export as JSON
const response = await fetch(
  `http://localhost:3000/api/v1/wallet/export/transactions?startDate=${startDate}&endDate=${endDate}&format=json`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const data = await response.json();
console.log(`Exported ${data.totalTransactions} transactions`);

// Export as CSV
const csvResponse = await fetch(
  `http://localhost:3000/api/v1/wallet/export/transactions?format=csv`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const blob = await csvResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'transactions.csv';
a.click();
```

## Transaction Types

| Type | Description |
|------|-------------|
| `deposit` | On-ramp deposit (e.g., XOF to USD) |
| `withdrawal` | Off-ramp withdrawal (e.g., USD to XOF) |
| `internal_transfer` | Transfer to another user by phone |
| `external_transfer` | Transfer to external wallet address |
| `transfer_internal` | Alias for internal_transfer |
| `transfer_external` | Alias for external_transfer |

## Date Formats

The API accepts dates in ISO 8601 format:

- Full datetime: `2026-01-18T12:00:00.000Z`
- Date only: `2026-01-18`
- Year-month: `2026-01`

All dates are interpreted as UTC.

## Error Responses

### 400 Bad Request - Invalid Date Format

```json
{
  "statusCode": 400,
  "message": "Invalid startDate format. Use ISO 8601 format (e.g., 2026-01-01)",
  "error": "Bad Request"
}
```

### 400 Bad Request - Invalid Date Range

```json
{
  "statusCode": 400,
  "message": "startDate must be before endDate",
  "error": "Bad Request"
}
```

### 401 Unauthorized - Missing or Invalid Token

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found - Wallet Not Found

```json
{
  "statusCode": 404,
  "message": "Wallet not found",
  "error": "Not Found"
}
```

## Performance Considerations

### Database Indexes

The export feature uses the following database index for optimal performance:

```sql
CREATE INDEX idx_transactions_wallet_date
ON transactions(wallet_id, created_at DESC);
```

### Pagination & Limits

- No built-in pagination (exports all matching transactions)
- For users with large transaction histories, consider:
  - Limiting date ranges
  - Implementing client-side pagination for JSON exports
  - Using streaming for CSV generation (future enhancement)

### Caching

Transaction exports are not cached as they should always reflect the current state.

## Security Considerations

1. **Authentication Required**: All export requests require valid JWT authentication
2. **User Isolation**: Users can only export their own transactions
3. **Rate Limiting**: Consider implementing rate limits on the export endpoint
4. **Audit Logging**: Log all export requests for compliance

## Frontend Integration

### React Example

```tsx
import React, { useState } from 'react';

const TransactionExport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async (format: 'csv' | 'json') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(
        `/api/v1/wallet/export/transactions?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')
          ?.split('filename=')[1] || 'transactions.csv';
        a.click();
      } else {
        const data = await response.json();
        console.log('Exported data:', data);
        // Handle JSON data (e.g., display in modal, save locally, etc.)
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Export Transactions</h2>
      <div>
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <div>
        <button onClick={() => handleExport('csv')} disabled={loading}>
          Export as CSV
        </button>
        <button onClick={() => handleExport('json')} disabled={loading}>
          Export as JSON
        </button>
      </div>
    </div>
  );
};

export default TransactionExport;
```

## Testing

### Manual Testing

1. Create test transactions
2. Export with various date ranges
3. Verify CSV formatting in Excel/Numbers
4. Verify JSON structure matches schema

### Automated Testing

```typescript
describe('ExportController', () => {
  it('should export transactions as CSV', async () => {
    const response = await request(app.getHttpServer())
      .get('/wallet/export/transactions?format=csv')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)
      .expect('Content-Type', /text\/csv/);

    expect(response.text).toContain('Date,Type,Description');
  });

  it('should export transactions as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/wallet/export/transactions?format=json')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.transactions).toBeInstanceOf(Array);
  });

  it('should filter by date range', async () => {
    const response = await request(app.getHttpServer())
      .get('/wallet/export/transactions?startDate=2026-01-01&endDate=2026-01-31&format=json')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    const transactions = response.body.transactions;
    transactions.forEach(tx => {
      const date = new Date(tx.date);
      expect(date >= new Date('2026-01-01')).toBe(true);
      expect(date <= new Date('2026-01-31')).toBe(true);
    });
  });
});
```

## Future Enhancements

1. **Streaming for Large Exports**: Implement streaming for users with thousands of transactions
2. **Scheduled Exports**: Allow users to schedule recurring exports (e.g., monthly)
3. **Email Delivery**: Option to receive exports via email
4. **Additional Formats**: Support for PDF, Excel (XLSX), OFX formats
5. **Custom Fields**: Allow users to select which fields to include in export
6. **Compression**: Gzip large exports automatically
7. **Multi-currency Support**: Include conversion rates and totals by currency

## Related Documentation

- [Transaction API](./TRANSACTION_API.md)
- [Wallet API](./WALLET_API.md)
- [Authentication](./AUTHENTICATION.md)
