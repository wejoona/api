# Quick Start Guide - West African Validation Decorators

## 5-Minute Setup

### 1. Import Decorators

```typescript
import {
  IsPhoneE164,
  IsXOFAmount,
  IsMobileMoneyProvider,
  IsWAEMUCountry,
} from '@/common/decorators/validation';
```

### 2. Use in DTOs

```typescript
export class CreateTransferDto {
  @IsPhoneE164()
  recipientPhone: string;

  @IsXOFAmount()
  amount: number;

  @IsMobileMoneyProvider()
  provider: string;

  @IsWAEMUCountry()
  country: string;
}
```

### 3. It Just Works!

NestJS automatically validates incoming requests using these decorators.

---

## Common Patterns

### Pattern 1: Mobile Money Transfer

```typescript
export class MobileMoneyTransferDto {
  @IsPhoneE164()
  phone: string;

  @IsXOFAmount({ checkMobileMoneyLimits: true })
  amount: number;

  @IsMobileMoneyProvider()
  provider: string;
}
```

### Pattern 2: Country-Specific Operations

```typescript
export class CountryOperationDto {
  @IsWAEMUCountry({ acceptNames: false })
  countryCode: string;

  @IsMobileMoneyProvider({ country: WAEMUCountry.COTE_IVOIRE })
  provider: string;

  @IsPhoneE164()
  phone: string;
}
```

### Pattern 3: Custom Amount Ranges

```typescript
export class SmallTransferDto {
  @IsXOFAmount({ min: 500, max: 50_000 })
  amount: number;
}

export class LargeTransferDto {
  @IsXOFAmount({ min: 100_000, max: 5_000_000 })
  amount: number;
}
```

---

## Cheat Sheet

| Decorator | Common Use | Example Value |
|-----------|-----------|---------------|
| `@IsPhoneE164()` | Phone validation | `'+2250123456789'` |
| `@IsXOFAmount()` | Money amounts | `50000` |
| `@IsMobileMoneyProvider()` | Provider names | `'orange_money'` |
| `@IsWAEMUCountry()` | Country codes | `'CI'` or `'Senegal'` |

---

## Real Examples

Check `examples.dto.ts` for 15 real-world DTO examples including:
- Basic transfers
- Mobile money deposits/withdrawals
- Country-specific operations
- Refunds
- Bulk transfers
- Payment links
- And more!

---

## Testing Your DTOs

```bash
# Run validation tests
npm run test -- decorators/validation
```

---

## Need Help?

1. Read full documentation: `README.md`
2. Check examples: `examples.dto.ts`
3. Review tests: `*.spec.ts` files

---

## Most Common Mistakes

### ❌ Wrong: Missing + in phone number
```typescript
phone: '2250123456789'  // Invalid
```

### ✅ Correct: E.164 format with +
```typescript
phone: '+2250123456789'  // Valid
```

---

### ❌ Wrong: Decimal XOF amount
```typescript
amount: 100.50  // Invalid (XOF has no cents)
```

### ✅ Correct: Whole number
```typescript
amount: 100  // Valid
```

---

### ❌ Wrong: Wrong provider for country
```typescript
@IsMobileMoneyProvider({ country: WAEMUCountry.SENEGAL })
provider: 'mtn_momo'  // Invalid (MTN not in Senegal)
```

### ✅ Correct: Valid provider for country
```typescript
@IsMobileMoneyProvider({ country: WAEMUCountry.SENEGAL })
provider: 'wave'  // Valid (Wave available in Senegal)
```

---

## Next Steps

1. Copy examples from `examples.dto.ts` to your DTOs
2. Customize options for your use case
3. Test with real data
4. Deploy!

---

Happy coding! 🚀
