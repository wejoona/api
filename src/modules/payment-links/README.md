# Payment Links Module

## Overview
The Payment Links module enables users to create shareable payment links for receiving payments. Links can have fixed or flexible amounts and support expiration dates.

## Features
- Create payment links with fixed or flexible amounts
- Share links via unique short codes
- Track link views and payment status
- Set expiration dates for time-sensitive payments
- Automatically mark links as paid when payment is received
- Deactivate/cancel unused links

## Architecture

```
payment-links/
├── domain/
│   ├── entities/payment-link.entity.ts      # Domain entity with business logic
│   └── repositories/payment-link.repository.ts  # Repository interface
├── infrastructure/
│   ├── orm-entities/payment-link.orm-entity.ts  # TypeORM entity
│   ├── mappers/payment-link.mapper.ts           # Domain <-> ORM mapping
│   └── repositories/payment-link.repository.ts  # Repository implementation
└── application/
    ├── controllers/payment-link.controller.ts   # REST endpoints
    ├── services/payment-link.service.ts         # Business logic
    └── dto/                                      # Request/Response DTOs
```

## API Endpoints

### Authenticated Endpoints

#### Create Payment Link
```
POST /api/v1/payment-links
Authorization: Bearer <token>

Request Body:
{
  "amount": 50.00,           // Optional: null for flexible amount
  "currency": "USDC",        // Optional: defaults to USDC
  "description": "Coffee",   // Optional
  "expiresAt": "2026-02-01T00:00:00Z"  // Optional
}

Response: PaymentLinkResponseDto
```

#### Get User's Payment Links
```
GET /api/v1/payment-links
Authorization: Bearer <token>

Response: PaymentLinkResponseDto[]
```

#### Get Payment Link by ID
```
GET /api/v1/payment-links/:id
Authorization: Bearer <token>

Response: PaymentLinkResponseDto
```

#### Deactivate Payment Link
```
DELETE /api/v1/payment-links/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Payment link deactivated"
}
```

### Public Endpoints

#### Get Payment Link by Code (Public)
```
GET /api/v1/payment-links/code/:code

Response: PaymentLinkResponseDto
```

### Payment Endpoints

#### Pay a Payment Link
```
POST /api/v1/payment-links/:code/pay
Authorization: Bearer <token>

Request Body:
{
  "amount": 25.00  // Required for flexible amount links, ignored for fixed
}

Response:
{
  "success": true,
  "message": "Payment successful",
  "transferId": "uuid"
}
```

## Database Schema

```sql
CREATE TABLE payment_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    amount DECIMAL(20, 6) NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    description TEXT NULL,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    paid_by_user_id UUID NULL REFERENCES users(id),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Domain Model

### PaymentLink Entity

**States:**
- `ACTIVE`: Link is active and can be paid
- `PAID`: Link has been paid
- `EXPIRED`: Link has passed expiration date
- `CANCELLED`: Link was manually cancelled

**Key Methods:**
- `incrementViewCount()`: Track views
- `markAsPaid(paidByUserId)`: Mark as paid
- `cancel()`: Deactivate link
- `expire()`: Mark as expired

**Computed Properties:**
- `isExpired`: Check if link has expired
- `isActive`: Check if link can be paid
- `isFlexibleAmount`: Check if amount is flexible

## Business Rules

1. **Payment Link Creation:**
   - User must have an active wallet
   - Expiry date must be in the future (if provided)
   - Amount is optional (null = flexible amount)
   - Unique short code is auto-generated (8 chars)

2. **Payment Processing:**
   - Cannot pay your own payment link
   - Link must be active and not expired
   - Flexible amount links require amount in request
   - Fixed amount links ignore amount in request
   - Payer must have sufficient balance
   - Creates internal transfer between wallets
   - Automatically marks link as paid

3. **Link Deactivation:**
   - Only link owner can deactivate
   - Cannot deactivate already paid links
   - Changes status to CANCELLED

4. **View Tracking:**
   - Public code endpoint increments view count
   - Helps track link engagement

## Dependencies

- **WalletModule**: To access wallet operations
- **TransferModule**: To create internal transfers
- **nanoid**: For generating short unique codes

## Installation

1. Install dependencies:
```bash
npm install nanoid
```

2. Run migration:
```bash
psql $DATABASE_URL -f scripts/migrations/create-payment-links-table.sql
```

3. Add module to AppModule:
```typescript
import { PaymentLinksModule } from './modules/payment-links';

@Module({
  imports: [
    // ... other modules
    PaymentLinksModule,
  ],
})
export class AppModule {}
```

## Usage Examples

### Create Fixed Amount Link
```typescript
const link = await paymentLinkService.createPaymentLink(userId, {
  amount: 100.00,
  currency: 'USDC',
  description: 'Invoice #123',
  expiresAt: '2026-02-15T00:00:00Z'
});

console.log(link.shareUrl); // https://joonapay.com/pay/ABC12345
```

### Create Flexible Amount Link
```typescript
const link = await paymentLinkService.createPaymentLink(userId, {
  description: 'Tip Jar',
  // amount not specified = flexible
});
```

### Pay a Link
```typescript
const result = await paymentLinkService.payPaymentLink(
  'ABC12345',
  payerUserId,
  { amount: 50.00 } // Only needed for flexible amount
);
```

## Testing

```bash
# Unit tests
npm run test payment-links

# E2E tests
npm run test:e2e payment-links
```

## Security Considerations

1. **Access Control:**
   - Only link owners can view link details via ID
   - Public can view via code (for payment)
   - Payment requires authentication

2. **Validation:**
   - Amount validation (min 0.01)
   - Balance validation before payment
   - Expiry date validation
   - Status validation

3. **Rate Limiting:**
   - Consider adding rate limits on public code endpoint
   - Prevent brute-force code guessing

## Future Enhancements

- [ ] Multiple uses per link (with max count)
- [ ] Webhook notifications on payment
- [ ] Custom link aliases (vanity codes)
- [ ] QR code generation
- [ ] Analytics dashboard
- [ ] Partial payments for flexible links
- [ ] Refund support
- [ ] Split payments (multiple recipients)
