# Bank Linking Module

Bank account linking module for JoonaPay USDC Wallet, enabling users to link their West African bank accounts for deposits and withdrawals.

## Features

- Link bank accounts (NSIA, Ecobank, Société Générale, Bank of Africa)
- OTP verification for account security
- Set primary account for quick access
- Balance checking (for supported banks)
- Deposit from bank to wallet
- Withdraw from wallet to bank
- Account encryption at rest

## API Endpoints

### Banks

```
GET /api/v1/banks
GET /api/v1/banks?country=CI
```

Returns list of supported banks with capabilities.

### Linked Accounts

```
GET /api/v1/bank-accounts
GET /api/v1/bank-accounts/:id
POST /api/v1/bank-accounts
POST /api/v1/bank-accounts/:id/verify
POST /api/v1/bank-accounts/:id/set-primary
DELETE /api/v1/bank-accounts/:id
```

### Operations

```
GET /api/v1/bank-accounts/:id/balance
POST /api/v1/bank-accounts/:id/deposit
POST /api/v1/bank-accounts/:id/withdraw
```

## Request Examples

### Link Bank Account

```json
POST /api/v1/bank-accounts
{
  "bank_code": "NSIA",
  "account_number": "CI123456789012345",
  "account_holder_name": "Jean Kouassi",
  "country_code": "CI"
}
```

### Verify Account

```json
POST /api/v1/bank-accounts/:id/verify
{
  "otp": "123456"
}
```

### Deposit

```json
POST /api/v1/bank-accounts/:id/deposit
{
  "amount": 50000,
  "description": "Top up wallet"
}
```

### Withdraw

```json
POST /api/v1/bank-accounts/:id/withdraw
{
  "amount": 25000,
  "description": "Cash out"
}
```

## Security

- **Account Number Encryption**: Account numbers are encrypted using AES-256-CBC before storage
- **Masked Display**: Only last 4 digits shown in responses
- **OTP Verification**: Required before account is active
- **Wallet Ownership**: Accounts can only be accessed by owning wallet

## Database Tables

### `linked_bank_accounts`

Stores linked bank account information with encrypted account numbers.

### `banks`

Reference table of supported banks with their capabilities.

## Environment Variables

```bash
BANK_ACCOUNT_ENCRYPTION_KEY=your-32-character-key-here
```

## TODO

- [ ] Integrate with actual bank verification service
- [ ] Implement real-time balance checking
- [ ] Add support for micro-deposit verification
- [ ] Implement actual deposit/withdrawal transactions
- [ ] Add transaction limits and daily caps
- [ ] Implement webhook handling for async operations
- [ ] Add support for more West African banks
- [ ] Implement bank account health monitoring

## Architecture

```
bank-linking/
├── domain/
│   ├── entities/
│   │   ├── linked-bank-account.entity.ts
│   │   └── bank.entity.ts
│   └── repositories/
│       ├── linked-bank-account.repository.ts
│       └── bank.repository.ts
├── infrastructure/
│   ├── orm-entities/
│   ├── repositories/
│   └── mappers/
└── application/
    ├── controllers/
    ├── services/
    └── dto/
```

## Usage

```typescript
import { BankLinkingService } from '@modules/bank-linking';

// Inject in your service
constructor(private readonly bankLinkingService: BankLinkingService) {}

// Link an account
const account = await this.bankLinkingService.linkBankAccount({
  walletId: user.walletId,
  bankCode: 'NSIA',
  accountNumber: 'CI123456789',
  accountHolderName: 'John Doe',
});

// Verify the account
await this.bankLinkingService.verifyBankAccount({
  walletId: user.walletId,
  accountId: account.id,
  otp: '123456',
});
```

## Testing

Test OTP: `123456` (matches mobile mock)

## Supported Banks

| Bank | Code | Balance Check | Direct Debit | Country |
|------|------|---------------|--------------|---------|
| NSIA Banque | NSIA | ✅ | ✅ | CI |
| Ecobank | ECOBANK | ❌ | ✅ | CI |
| Société Générale | SGCI | ❌ | ✅ | CI |
| Bank of Africa | BOA | ❌ | ✅ | CI |

## Limits

- Maximum 5 linked accounts per wallet
- Account numbers must be valid for selected bank
- Verification required before deposits/withdrawals
