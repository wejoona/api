# Recurring Transfers Module

Complete implementation of recurring/scheduled transfer functionality for the USDC Wallet backend.

## Overview

This module enables users to set up automated recurring transfers that execute on a schedule (daily, weekly, biweekly, or monthly). Matches the mobile mock API endpoints exactly.

## Features

- **Create recurring transfers** with flexible scheduling
- **Multiple frequencies**: daily, weekly, biweekly, monthly
- **Flexible scheduling**:
  - Set specific day of week for weekly/biweekly
  - Set specific day of month for monthly
  - Optional end date or occurrence limit
- **Status management**: active, paused, cancelled, completed
- **Execution history** tracking with success/failure logging
- **Upcoming transfers** preview
- **Next dates calculation** for planning

## Database Schema

### Tables

#### `wallet.recurring_transfers`
Main table storing recurring transfer configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| wallet_id | uuid | Foreign key to wallets |
| recipient_phone | varchar(20) | Recipient phone number |
| recipient_name | varchar(100) | Recipient display name |
| amount | decimal(18,6) | Transfer amount |
| currency | varchar(10) | Currency code (default: XOF) |
| frequency | enum | daily/weekly/biweekly/monthly |
| start_date | timestamp | First execution date |
| end_date | timestamp | Optional end date |
| next_execution_date | timestamp | Next scheduled execution |
| occurrences_total | int | Total occurrences if limited |
| occurrences_remaining | int | Remaining occurrences |
| status | enum | active/paused/cancelled/completed |
| note | text | Optional note/description |
| day_of_week | int | Day of week (0-6) for weekly/biweekly |
| day_of_month | int | Day of month (1-31) for monthly |
| executed_count | int | Number of successful executions |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

#### `wallet.recurring_transfer_history`
Execution history for audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recurring_transfer_id | uuid | Foreign key to recurring_transfers |
| amount | decimal(18,6) | Transfer amount |
| currency | varchar(10) | Currency code |
| executed_at | timestamp | Execution timestamp |
| success | boolean | Whether execution succeeded |
| error_message | text | Error message if failed |
| transaction_id | uuid | Related transaction ID if successful |

## API Endpoints

### GET /recurring-transfers
List all recurring transfers for the authenticated user.

**Response:**
```json
{
  "transfers": [
    {
      "id": "uuid",
      "walletId": "uuid",
      "recipientPhone": "+225 07 45 67 89 12",
      "recipientName": "Fatou Diallo",
      "amount": 25000,
      "currency": "XOF",
      "frequency": "weekly",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": null,
      "nextExecutionDate": "2024-02-01T00:00:00Z",
      "occurrencesTotal": null,
      "occurrencesRemaining": null,
      "status": "active",
      "note": "Weekly allowance",
      "dayOfWeek": 1,
      "dayOfMonth": null,
      "executedCount": 4,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### GET /recurring-transfers/:id
Get a single recurring transfer by ID.

### POST /recurring-transfers
Create a new recurring transfer.

**Request Body:**
```json
{
  "recipientPhone": "+225 07 45 67 89 12",
  "recipientName": "Fatou Diallo",
  "amount": 25000,
  "currency": "XOF",
  "frequency": "weekly",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": null,
  "occurrences": null,
  "note": "Weekly allowance",
  "dayOfWeek": 1,
  "dayOfMonth": null
}
```

### PATCH /recurring-transfers/:id
Update a recurring transfer (amount, frequency, note, etc.).

**Request Body:**
```json
{
  "amount": 30000,
  "note": "Updated amount"
}
```

### POST /recurring-transfers/:id/pause
Pause an active recurring transfer.

### POST /recurring-transfers/:id/resume
Resume a paused recurring transfer.

### DELETE /recurring-transfers/:id
Cancel a recurring transfer (soft delete by setting status).

### GET /recurring-transfers/:id/history
Get execution history for a recurring transfer.

**Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "recurringTransferId": "uuid",
      "amount": 25000,
      "currency": "XOF",
      "executedAt": "2024-01-08T00:00:00Z",
      "success": true,
      "errorMessage": null,
      "transactionId": "txn_abc123"
    }
  ]
}
```

### GET /recurring-transfers/upcoming
Get upcoming executions across all active recurring transfers.

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "upcoming": [
    {
      "recurringTransferId": "uuid",
      "recipientName": "Fatou Diallo",
      "amount": 25000,
      "currency": "XOF",
      "scheduledDate": "2024-02-01T00:00:00Z"
    }
  ]
}
```

### GET /recurring-transfers/:id/next-dates
Get next N execution dates for a recurring transfer.

**Query Parameters:**
- `count` (optional): Number of dates to return (default: 3)

**Response:**
```json
{
  "dates": [
    "2024-02-01T00:00:00Z",
    "2024-02-08T00:00:00Z",
    "2024-02-15T00:00:00Z"
  ]
}
```

## Architecture

### Domain Layer
- **Entities**: `RecurringTransfer`, `RecurringTransferHistory`
- **Repositories**: Repository interfaces for data access
- **Business logic**: Frequency calculations, status transitions, validation

### Infrastructure Layer
- **ORM Entities**: TypeORM entities with decorators
- **Repositories**: TypeORM implementations
- **Mappers**: Domain ↔ ORM entity conversion

### Application Layer
- **Controllers**: REST API endpoints with JWT authentication
- **Services**: Business logic orchestration
- **DTOs**: Request/response validation

## Business Rules

1. **Maximum recurring transfers per wallet**: 50
2. **Status transitions**:
   - Active → Paused (can resume)
   - Paused → Active (resume)
   - Active/Paused → Cancelled (terminal)
   - Active → Completed (automatic when occurrences exhausted or end date reached)
3. **Frequency-specific fields**:
   - Weekly/Biweekly requires `dayOfWeek` (0=Sunday, 6=Saturday)
   - Monthly requires `dayOfMonth` (1-31)
4. **Start date validation**: Must be today or in the future
5. **End date validation**: Must be after start date if specified
6. **Amount validation**: Must be positive

## Execution Flow

1. **Scheduled Job** (to be implemented) queries for due transfers:
   ```typescript
   const dueTransfers = await recurringTransferService.getTransfersDueForExecution();
   ```

2. **Execute each transfer** through existing transfer service

3. **Record execution**:
   ```typescript
   await recurringTransferService.recordExecution(
     transferId,
     success,
     transactionId,
     errorMessage
   );
   ```

4. **Update next execution date** automatically calculated

5. **Complete if needed** - automatically set to completed when:
   - Occurrences exhausted
   - End date reached

## Example Usage

### Creating a Weekly Transfer
```typescript
const transfer = await recurringTransferService.createRecurringTransfer({
  walletId: 'user-wallet-id',
  recipientPhone: '+225 07 45 67 89 12',
  recipientName: 'Fatou Diallo',
  amount: 25000,
  currency: 'XOF',
  frequency: 'weekly',
  startDate: new Date('2024-02-01'),
  dayOfWeek: 1, // Monday
  note: 'Weekly allowance'
});
```

### Creating a Monthly Transfer with Limit
```typescript
const transfer = await recurringTransferService.createRecurringTransfer({
  walletId: 'user-wallet-id',
  recipientPhone: '+225 05 12 34 56 78',
  recipientName: 'Amadou Traore',
  amount: 100000,
  currency: 'XOF',
  frequency: 'monthly',
  startDate: new Date('2024-02-01'),
  dayOfMonth: 1, // First day of month
  occurrences: 12, // 12 months
  note: 'Monthly rent payment'
});
```

### Pausing a Transfer
```typescript
await recurringTransferService.pauseRecurringTransfer(walletId, transferId);
```

### Getting Next Dates
```typescript
const dates = await recurringTransferService.getNextExecutionDates(
  walletId,
  transferId,
  5 // Next 5 dates
);
```

## Migration

Run the migration to create the tables:

```bash
npm run migration:run
```

The migration file is located at:
```
src/database/migrations/1744000000000-CreateRecurringTransfersTable.ts
```

## Module Registration

The module is already registered in `app.module.ts`:

```typescript
import { RecurringTransferModule } from './modules/recurring-transfers/recurring-transfer.module';

@Module({
  imports: [
    // ...
    RecurringTransferModule,
    // ...
  ],
})
export class AppModule {}
```

## Testing

### Unit Tests
Test domain entities and business logic:
- Frequency calculations
- Status transitions
- Next date calculations

### Integration Tests
Test API endpoints:
- CRUD operations
- Authentication/authorization
- Execution history recording

### Example Test
```typescript
describe('RecurringTransfer Entity', () => {
  it('should calculate next weekly date correctly', () => {
    const transfer = RecurringTransfer.create({
      walletId: 'wallet-id',
      recipientPhone: '+225 07 45 67 89 12',
      recipientName: 'Test',
      amount: 1000,
      currency: 'XOF',
      frequency: RecurringTransferFrequency.WEEKLY,
      startDate: new Date('2024-01-01'),
      dayOfWeek: 1,
    });

    transfer.recordExecution(true);

    expect(transfer.nextExecutionDate).toEqual(new Date('2024-01-08'));
  });
});
```

## Next Steps

1. **Implement execution job** - Create a scheduled job (cron) to process due transfers
2. **Add notifications** - Notify users before/after executions
3. **Add limits** - Implement daily/monthly transfer limits
4. **Add analytics** - Track execution success rates, popular frequencies
5. **Add webhook events** - Emit events for transfer executions
6. **Add retry logic** - Automatic retry for failed executions

## Related Modules

- **TransferModule**: Executes the actual transfers
- **WalletModule**: Validates wallet balances
- **NotificationModule**: Sends execution notifications
- **BeneficiaryModule**: Links to saved beneficiaries

## Files Created

```
src/modules/recurring-transfers/
├── domain/
│   ├── entities/
│   │   ├── recurring-transfer.entity.ts
│   │   ├── recurring-transfer-history.entity.ts
│   │   └── index.ts
│   └── repositories/
│       ├── recurring-transfer.repository.ts
│       ├── recurring-transfer-history.repository.ts
│       └── index.ts
├── infrastructure/
│   ├── orm-entities/
│   │   ├── recurring-transfer.orm-entity.ts
│   │   ├── recurring-transfer-history.orm-entity.ts
│   │   └── index.ts
│   ├── mappers/
│   │   ├── recurring-transfer.mapper.ts
│   │   ├── recurring-transfer-history.mapper.ts
│   │   └── index.ts
│   └── repositories/
│       ├── recurring-transfer.repository.ts
│       ├── recurring-transfer-history.repository.ts
│       └── index.ts
├── application/
│   ├── controllers/
│   │   ├── recurring-transfer.controller.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── recurring-transfer.service.ts
│   │   └── index.ts
│   └── dto/
│       ├── create-recurring-transfer.dto.ts
│       ├── update-recurring-transfer.dto.ts
│       └── index.ts
├── recurring-transfer.module.ts
├── index.ts
└── README.md

src/database/migrations/
└── 1744000000000-CreateRecurringTransfersTable.ts
```
