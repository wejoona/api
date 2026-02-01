# Cards Module - Quick Start Guide

## Setup (First Time)

### 1. Run Database Migration
```bash
cd usdc-wallet
npm run migration:run
```

This creates the `cards` table with all necessary columns and indexes.

### 2. Verify Module Registration
The module is already registered in `app.module.ts`:
```typescript
import { CardsModule } from './modules/cards/cards.module';
...
imports: [
  ...
  CardsModule,  // ✅ Added
  ...
]
```

### 3. Start Development Server
```bash
npm run start:dev
```

## Testing the API

### Using cURL

#### Create a Card
```bash
curl -X POST http://localhost:3000/api/v1/cards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cardholderName": "Amadou Diallo",
    "spendingLimit": 1000
  }'
```

#### List Cards
```bash
curl http://localhost:3000/api/v1/cards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Card Details
```bash
curl http://localhost:3000/api/v1/cards/{CARD_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Freeze Card
```bash
curl -X PUT http://localhost:3000/api/v1/cards/{CARD_ID}/freeze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Unfreeze Card
```bash
curl -X PUT http://localhost:3000/api/v1/cards/{CARD_ID}/unfreeze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Spending Limit
```bash
curl -X PUT http://localhost:3000/api/v1/cards/{CARD_ID}/limit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spendingLimit": 2000
  }'
```

#### Cancel Card
```bash
curl -X DELETE http://localhost:3000/api/v1/cards/{CARD_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Using the Service in Other Modules

### Import the Module
```typescript
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [CardsModule],
  // ...
})
export class YourModule {}
```

### Inject the Service
```typescript
import { CardService } from '../cards';

@Injectable()
export class YourService {
  constructor(private readonly cardService: CardService) {}

  async example(userId: string) {
    const cards = await this.cardService.getCards(userId);
    return cards;
  }
}
```

### Use the Repository
```typescript
import { CardRepository } from '../cards';

@Injectable()
export class YourService {
  constructor(private readonly cardRepository: CardRepository) {}

  async example(cardId: string) {
    const card = await this.cardRepository.findById(cardId);
    return card;
  }
}
```

## Common Operations

### Create Card for User
```typescript
const card = await cardService.createCard(userId, {
  cardholderName: 'John Doe',
  spendingLimit: 1000,
});
```

### Check Card Status
```typescript
const card = await cardService.getCard(cardId, userId);
if (card.isFrozen) {
  // Card is frozen
}
if (card.isActive) {
  // Card is active
}
```

### Update Limit
```typescript
const card = await cardService.updateSpendingLimit(cardId, userId, {
  spendingLimit: 2000,
});
```

### Freeze/Unfreeze
```typescript
// Freeze
await cardService.freezeCard(cardId, userId);

// Unfreeze
await cardService.unfreezeCard(cardId, userId);
```

## Testing

### Run Unit Tests
```bash
npm run test -- card.service.spec
```

### Run with Coverage
```bash
npm run test:cov -- card.service
```

### Watch Mode
```bash
npm run test:watch -- card.service
```

## Common Errors & Solutions

### "User already has a virtual card"
**Error**: `BadRequestException: User already has a virtual card`

**Solution**: Current business rule limits users to one card. To allow multiple cards, update `CardService.createCard()`:
```typescript
// Remove or modify this check:
const existingCards = await this.cardRepository.findByUserId(userId);
if (existingCards.length > 0) {
  throw new BadRequestException('User already has a virtual card');
}
```

### "Wallet not found"
**Error**: `NotFoundException: Wallet not found`

**Solution**: Ensure the user has a wallet created first. Create a wallet:
```typescript
const wallet = await walletService.createWallet(userId);
```

### "Card is not frozen"
**Error**: `Error: Card is not frozen`

**Solution**: You're trying to unfreeze a card that isn't frozen. Check status first:
```typescript
if (card.isFrozen) {
  await cardService.unfreezeCard(cardId, userId);
}
```

### "Spending limit must be at least $10"
**Error**: `BadRequestException: Spending limit must be at least $10`

**Solution**: Ensure spending limit is between $10 and $10,000:
```typescript
const limit = Math.max(10, Math.min(10000, requestedLimit));
```

## Database Queries

### Find All Active Cards
```typescript
const activeCards = await cardRepository.findActiveByUserId(userId);
```

### Count User's Cards
```typescript
const count = await cardRepository.countByUserId(userId);
```

### Find by Wallet
```typescript
const cards = await cardRepository.findByWalletId(walletId);
```

## Mobile Mock Compatibility

The backend API matches the mobile mock exactly:

| Mobile Mock Endpoint | Backend Endpoint | Status |
|---------------------|------------------|--------|
| GET /cards | GET /api/v1/cards | ✅ |
| POST /cards | POST /api/v1/cards | ✅ |
| GET /cards/:id | GET /api/v1/cards/:id | ✅ |
| PUT /cards/:id/freeze | PUT /api/v1/cards/:id/freeze | ✅ |
| PUT /cards/:id/unfreeze | PUT /api/v1/cards/:id/unfreeze | ✅ |
| PUT /cards/:id/limit | PUT /api/v1/cards/:id/limit | ✅ |
| GET /cards/:id/transactions | Not implemented yet | ⏳ |

To switch mobile from mock to production:
```dart
// In mobile app
MockConfig.useMocks = false;
```

## File Locations

```
Backend Module:
/usdc-wallet/src/modules/cards/

Key Files:
- cards.module.ts               # Module definition
- application/controllers/card.controller.ts
- application/services/card.service.ts
- domain/entities/card.entity.ts
- infrastructure/migrations/create-cards-table.migration.ts

Mobile Mock:
/mobile/lib/mocks/services/cards/cards_mock.dart
```

## Next Steps

1. ✅ Run migration
2. ✅ Test endpoints with cURL/Postman
3. ⏳ Implement card transactions endpoint
4. ⏳ Add real card provider integration
5. ⏳ Enable multiple cards per user
6. ⏳ Add physical card support

## Support

- Documentation: `README.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- API reference: Test with cURL commands above
- Code examples: `card.service.spec.ts`
