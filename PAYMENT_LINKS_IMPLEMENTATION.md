# Payment Links Feature Implementation

## Overview
Implemented a complete Payment Links module that allows users to create shareable payment links for receiving payments with fixed or flexible amounts.

## Files Created

### Domain Layer
```
/src/modules/payment-links/domain/
├── entities/
│   └── payment-link.entity.ts          # Domain entity with business logic
└── repositories/
    └── payment-link.repository.ts      # Repository interface
```

### Infrastructure Layer
```
/src/modules/payment-links/infrastructure/
├── orm-entities/
│   └── payment-link.orm-entity.ts      # TypeORM entity definition
├── mappers/
│   └── payment-link.mapper.ts          # Domain <-> ORM mapping
└── repositories/
    └── payment-link.repository.ts      # Repository implementation
```

### Application Layer
```
/src/modules/payment-links/application/
├── controllers/
│   └── payment-link.controller.ts      # REST endpoints
├── services/
│   └── payment-link.service.ts         # Business logic & orchestration
└── dto/
    ├── create-payment-link.dto.ts      # Create request DTO
    ├── pay-payment-link.dto.ts         # Payment request DTO
    ├── payment-link-response.dto.ts    # Response DTO
    └── index.ts
```

### Module & Configuration
```
/src/modules/payment-links/
├── payment-links.module.ts             # NestJS module definition
├── index.ts                            # Module exports
└── README.md                           # Documentation
```

### Database Migration
```
/scripts/migrations/
└── create-payment-links-table.sql      # SQL migration script
```

### Root Files Updated
```
/src/app.module.ts                      # Added PaymentLinksModule import
```

## Installation Steps

### 1. Install Dependencies
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm install nanoid
```

### 2. Run Database Migration
```bash
# Using psql
psql $DATABASE_URL -f scripts/migrations/create-payment-links-table.sql

# Or manually connect to your database and run:
# cat scripts/migrations/create-payment-links-table.sql | psql $DATABASE_URL
```

### 3. Verify Installation
```bash
# Start the development server
npm run start:dev

# The module should be loaded automatically via app.module.ts
```

## API Endpoints

### Base URL
```
/api/v1/payment-links
```

### Endpoints

#### 1. Create Payment Link (Authenticated)
```http
POST /api/v1/payment-links
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "amount": 50.00,           // Optional: null for flexible amount
  "currency": "USDC",        // Optional: defaults to USDC
  "description": "Coffee",   // Optional
  "expiresAt": "2026-02-01T00:00:00Z"  // Optional: ISO 8601 format
}

Response: 200 OK
{
  "id": "uuid",
  "userId": "uuid",
  "walletId": "uuid",
  "code": "ABC12345",
  "amount": 50.00,
  "currency": "USDC",
  "description": "Coffee",
  "status": "active",
  "expiresAt": "2026-02-01T00:00:00Z",
  "paidAt": null,
  "paidByUserId": null,
  "viewCount": 0,
  "isExpired": false,
  "isActive": true,
  "isFlexibleAmount": false,
  "shareUrl": "https://joonapay.com/pay/ABC12345",
  "createdAt": "2026-01-29T...",
  "updatedAt": "2026-01-29T..."
}
```

#### 2. Get User's Payment Links (Authenticated)
```http
GET /api/v1/payment-links
Authorization: Bearer <jwt-token>

Response: 200 OK
[
  { /* PaymentLinkResponseDto */ },
  { /* PaymentLinkResponseDto */ }
]
```

#### 3. Get Payment Link by ID (Authenticated)
```http
GET /api/v1/payment-links/:id
Authorization: Bearer <jwt-token>

Response: 200 OK
{ /* PaymentLinkResponseDto */ }
```

#### 4. Get Payment Link by Code (Public)
```http
GET /api/v1/payment-links/code/:code

Response: 200 OK
{ /* PaymentLinkResponseDto */ }
```

#### 5. Pay Payment Link (Authenticated)
```http
POST /api/v1/payment-links/:code/pay
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "amount": 25.00  // Required only for flexible amount links
}

Response: 200 OK
{
  "success": true,
  "message": "Payment successful",
  "transferId": "uuid"
}
```

#### 6. Deactivate Payment Link (Authenticated)
```http
DELETE /api/v1/payment-links/:id
Authorization: Bearer <jwt-token>

Response: 200 OK
{
  "success": true,
  "message": "Payment link deactivated"
}
```

## Database Schema

### payment_links Table
```sql
CREATE TABLE payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    amount DECIMAL(20, 6) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
    description TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    paid_at TIMESTAMP WITH TIME ZONE NULL,
    paid_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_payment_links_user_id` - For user queries
- `idx_payment_links_wallet_id` - For wallet queries
- `idx_payment_links_code` - For public lookup by code
- `idx_payment_links_status` - For status filtering
- `idx_payment_links_expires_at` - For expiry checks
- `idx_payment_links_created_at` - For sorting

## Features

### 1. Flexible Amount Support
- Links can have fixed amounts or flexible amounts (null)
- Flexible links allow payer to specify amount
- Fixed amount links ignore payer-provided amount

### 2. Link Status Management
Payment link states:
- `ACTIVE` - Can be paid
- `PAID` - Has been paid (single use)
- `EXPIRED` - Past expiration date
- `CANCELLED` - Manually deactivated

### 3. View Tracking
- Tracks how many times a link has been viewed
- Increments automatically on public code lookup

### 4. Automatic Payment Processing
When a link is paid:
1. Validates link status and expiry
2. Checks payer balance
3. Creates internal transfer
4. Debits payer wallet
5. Credits recipient wallet
6. Marks link as paid
7. Records payer user ID

### 5. Security Features
- Links owned by users (cannot pay own link)
- Balance validation before payment
- Status validation (active, not expired)
- Authentication required for payment
- Public code endpoint is read-only

### 6. Code Generation
- Uses `nanoid` library
- 8-character alphanumeric codes
- Uppercase letters and numbers only
- Collision-resistant unique codes

## Business Rules

### Creation Rules
1. User must have an active wallet
2. Expiry date must be in the future (if provided)
3. Amount must be positive (if provided)
4. Currency defaults to USDC

### Payment Rules
1. Cannot pay your own payment link
2. Link must be active and not expired
3. Payer must have sufficient balance
4. Both wallets must be active
5. Flexible amount links require amount in request
6. Fixed amount links ignore amount in request

### Deactivation Rules
1. Only link owner can deactivate
2. Cannot deactivate paid links
3. Sets status to CANCELLED

## Dependencies

### Required Modules
- **WalletModule** - For wallet operations
- **TransferModule** - For internal transfers

### Required NPM Packages
- **nanoid** - For generating unique short codes

## Integration Points

### Wallet Integration
- Uses `IWalletRepository` for wallet operations
- Validates wallet status and balance
- Performs debit/credit operations

### Transfer Integration
- Uses `ITransferRepository` for transfer creation
- Creates internal transfers with metadata
- Links payment to original payment link

### Authentication
- Uses `JwtAuthGuard` for protected endpoints
- Uses `CurrentUser` decorator for user context

## Testing

### Unit Tests (To Be Implemented)
```bash
npm run test payment-links
```

Test coverage should include:
- PaymentLink entity business logic
- PaymentLinkService methods
- Repository operations
- DTO validation

### E2E Tests (To Be Implemented)
```bash
npm run test:e2e payment-links
```

Test scenarios:
- Create fixed amount link
- Create flexible amount link
- Get user's links
- Get link by code (public)
- Pay fixed amount link
- Pay flexible amount link
- Deactivate link
- Expired link handling
- Insufficient balance handling

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Payment link has expired",
  "error": "Bad Request"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Payment link not found",
  "error": "Not Found"
}
```

## Configuration

### Environment Variables

Add to `.env`:
```env
APP_URL=https://joonapay.com  # Used for shareUrl generation
```

## Monitoring & Observability

### Key Metrics to Track
- Total payment links created
- Conversion rate (views → payments)
- Average time to payment
- Failed payment attempts
- Expired links ratio

### Logging Points
- Link creation
- Link payment
- Link deactivation
- Failed payment attempts
- Expired link access

## Future Enhancements

### Short-term
- [ ] Add webhook notifications on payment
- [ ] Add QR code generation for links
- [ ] Add link analytics dashboard
- [ ] Add rate limiting on public code endpoint

### Medium-term
- [ ] Support multiple uses per link
- [ ] Add custom vanity codes
- [ ] Add partial payments for flexible links
- [ ] Add refund support

### Long-term
- [ ] Split payments (multiple recipients)
- [ ] Recurring payment links
- [ ] Conditional payment links (min/max amounts)
- [ ] Geographic restrictions

## Troubleshooting

### Link Creation Fails
- Verify user has active wallet
- Check database connection
- Verify nanoid package installed

### Payment Fails
- Check wallet balances
- Verify link status and expiry
- Check transfer module availability

### Code Collisions
- Very rare with nanoid (8 chars = ~2 trillion combinations)
- Database unique constraint will catch duplicates
- Service will retry with new code automatically

## Support

For questions or issues:
1. Check README.md in module directory
2. Review API documentation
3. Check TypeScript types and interfaces
4. Review unit tests for examples

## Changelog

### v1.0.0 (2026-01-29)
- Initial implementation
- Support for fixed and flexible amount links
- Public code lookup
- Internal payment processing
- Link deactivation
- View tracking
