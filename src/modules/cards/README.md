# Cards Module

Virtual and physical card management for JoonaPay USDC Wallet.

## Features

- **Virtual Cards**: Instantly create virtual debit cards linked to USDC wallet
- **Card Management**: Freeze, unfreeze, and cancel cards
- **Spending Limits**: Configurable spending limits ($10 - $10,000)
- **Security**: Masked card numbers, separate CVV storage
- **Transaction Tracking**: Track spending against limits

## Architecture

Follows Clean Architecture (DDD) pattern:

```
cards/
├── domain/                    # Business logic
│   ├── entities/             # Card entity with business rules
│   └── repositories/         # Repository interfaces
├── infrastructure/           # Implementation details
│   ├── orm-entities/         # TypeORM entities
│   ├── repositories/         # Repository implementations
│   └── migrations/           # Database migrations
└── application/              # Use cases & API
    ├── controllers/          # REST endpoints
    ├── services/            # Application services
    └── dto/                 # Request/Response DTOs
```

## API Endpoints

### List Cards
```http
GET /api/v1/cards
Authorization: Bearer {token}

Response 200:
{
  "cards": [
    {
      "id": "uuid",
      "userId": "uuid",
      "walletId": "uuid",
      "maskedCardNumber": "****1234",
      "cardholderName": "John Doe",
      "cardType": "virtual",
      "status": "active",
      "spendingLimit": 1000.00,
      "spentAmount": 150.50,
      "remainingLimit": 849.50,
      "currency": "USD",
      "expiryMonth": "12",
      "expiryYear": "26",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Card
```http
POST /api/v1/cards
Authorization: Bearer {token}
Content-Type: application/json

{
  "cardholderName": "John Doe",
  "spendingLimit": 1000.00,
  "cardType": "virtual"  // optional, defaults to "virtual"
}

Response 201:
{
  "id": "uuid",
  "cardNumber": "4532123456781234",  // Full card number on creation
  "cvv": "123",
  "expiryMonth": "12",
  "expiryYear": "26",
  "cardholderName": "John Doe",
  "status": "active",
  "spendingLimit": 1000.00,
  ...
}
```

### Get Card Details
```http
GET /api/v1/cards/:id
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "cardNumber": "4532123456781234",  // Full card number for detail view
  "cvv": "123",
  ...
}
```

### Freeze Card
```http
PUT /api/v1/cards/:id/freeze
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "status": "frozen",
  "frozenAt": "2024-01-01T12:00:00Z",
  ...
}
```

### Unfreeze Card
```http
PUT /api/v1/cards/:id/unfreeze
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "status": "active",
  "frozenAt": null,
  ...
}
```

### Update Spending Limit
```http
PUT /api/v1/cards/:id/limit
Authorization: Bearer {token}
Content-Type: application/json

{
  "spendingLimit": 2000.00
}

Response 200:
{
  "id": "uuid",
  "spendingLimit": 2000.00,
  ...
}
```

### Cancel Card
```http
DELETE /api/v1/cards/:id
Authorization: Bearer {token}

Response 204: No Content
```

## Business Rules

### Card Creation
- Users limited to 1 card initially
- Minimum spending limit: $10
- Maximum spending limit: $10,000
- Requires active wallet
- Card number automatically generated (Visa format)
- 3-year expiry from creation date

### Card Status
- **active**: Card can be used for transactions
- **frozen**: Temporarily disabled, can be unfrozen
- **cancelled**: Permanently disabled, cannot be reactivated

### Security
- Card numbers are masked (****1234) in list views
- Full card details only shown on creation and detail view
- CVV stored securely
- User can only access their own cards

### Spending Limits
- Can be updated after card creation
- Must be between $10 and $10,000
- Tracked per card independently
- Resets can be implemented with spent_amount reset

## Database Schema

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  card_number VARCHAR(16) NOT NULL,
  cvv VARCHAR(3) NOT NULL,
  expiry_month VARCHAR(2) NOT NULL,
  expiry_year VARCHAR(2) NOT NULL,
  cardholder_name VARCHAR(255) NOT NULL,
  card_type VARCHAR(20) DEFAULT 'virtual',
  status VARCHAR(20) DEFAULT 'active',
  spending_limit DECIMAL(18,2) NOT NULL,
  spent_amount DECIMAL(18,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  frozen_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_wallet_id ON cards(wallet_id);
CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_status ON cards(status);
```

## Future Enhancements

### Card Transactions
Add a separate `card_transactions` table to track card usage:

```typescript
// Domain entity
export class CardTransactionEntity {
  id: string;
  cardId: string;
  merchantName: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'declined';
  createdAt: Date;
}

// Endpoint
GET /api/v1/cards/:id/transactions
```

### Physical Cards
- Shipping address management
- Card activation flow
- Shipping status tracking
- Replacement card requests

### Advanced Features
- Multiple cards per user
- Card controls (online/offline, regions, categories)
- Virtual card generation for one-time use
- Apple Pay / Google Pay tokenization
- Real-time transaction notifications
- Spending analytics and insights

## Integration with Mobile Mock

This backend implementation matches the mobile mock at:
`/mobile/lib/mocks/services/cards/cards_mock.dart`

The API contracts are identical, ensuring seamless integration between mock and production.
