# West African Validation Decorators

Custom class-validator decorators for West African context validation in the JoonaPay USDC Wallet backend.

## Overview

This library provides specialized validators for:
- Phone numbers (E.164 format with WAEMU patterns)
- XOF amounts (CFA Franc currency)
- Mobile money providers (Orange Money, MTN, Wave, etc.)
- WAEMU country codes (West African Economic and Monetary Union)

## Installation

These decorators are built on `class-validator` and are ready to use in any NestJS DTO.

```typescript
import {
  IsPhoneE164,
  IsXOFAmount,
  IsMobileMoneyProvider,
  IsWAEMUCountry,
} from '@/common/decorators/validation';
```

## Decorators

### @IsPhoneE164

Validates E.164 phone numbers with focus on West African (WAEMU) countries.

**Supported Countries:**
- Côte d'Ivoire: +225 (10 digits)
- Senegal: +221 (9 digits)
- Mali: +223 (8 digits)
- Burkina Faso: +226 (8 digits)
- Niger: +227 (8 digits)
- Togo: +228 (8 digits)
- Benin: +229 (8 digits)
- Guinea-Bissau: +245 (7 digits)

**Usage:**

```typescript
class CreateTransferDto {
  // Strict mode: West African numbers only
  @IsPhoneE164()
  recipientPhone: string; // Must be +225XXXXXXXXXX, +221XXXXXXXXX, etc.
}

class InternationalTransferDto {
  // Non-strict: Any valid E.164 number
  @IsPhoneE164(false)
  recipientPhone: string; // Any E.164 number worldwide
}
```

**Parameters:**
- `strict` (boolean, default: true): If true, validates against WAEMU patterns only

**Examples:**
```typescript
// Valid West African numbers
'+2250123456789'    // Côte d'Ivoire
'+221771234567'     // Senegal
'+22376543210'      // Mali

// Invalid
'2250123456789'     // Missing +
'+225012345'        // Wrong digit count
'+33612345678'      // Non-WAEMU (strict mode)
```

---

### @IsXOFAmount

Validates XOF (CFA Franc) amounts with business rules.

**Features:**
- Whole numbers only (XOF has no subunits)
- Configurable min/max ranges
- Mobile money limits enforcement
- Support for refunds (negative amounts)

**Usage:**

```typescript
class CreateTransferDto {
  // Default: 100 - 2,000,000 XOF
  @IsXOFAmount()
  amount: number;
}

class MobileMoneyTransferDto {
  // Enforce mobile money limits (500K XOF max)
  @IsXOFAmount({ checkMobileMoneyLimits: true })
  amount: number;
}

class CustomRangeDto {
  // Custom range
  @IsXOFAmount({ min: 500, max: 100_000 })
  amount: number;
}

class RefundDto {
  // Allow negative amounts for refunds
  @IsXOFAmount({ allowNegative: true })
  amount: number;
}
```

**Options:**
```typescript
interface XOFAmountOptions {
  min?: number;              // Min amount (default: 100)
  max?: number;              // Max amount (default: 2,000,000)
  allowZero?: boolean;       // Allow 0 (default: false)
  allowNegative?: boolean;   // Allow negative for refunds (default: false)
  checkMobileMoneyLimits?: boolean; // Enforce 500K limit (default: false)
}
```

**Examples:**
```typescript
// Valid amounts
100          // Minimum
50_000       // Typical transfer
500_000      // Mobile money max
2_000_000    // Default max

// Invalid
99           // Below minimum
100.50       // Decimal (XOF has no cents)
2_000_001    // Above maximum
-1000        // Negative (unless allowNegative: true)
```

---

### @IsMobileMoneyProvider

Validates mobile money provider names with country-specific availability.

**Supported Providers:**
- `orange_money` - Orange Money (CI, SN, ML, BF, NE, GW)
- `mtn_momo` - MTN Mobile Money (CI, BJ)
- `wave` - Wave (CI, SN)
- `moov_money` - Moov Money (CI, ML, BF, NE, TG, BJ)
- `free_money` - Free Money (SN)
- `yup` - YUP (TG)

**Usage:**

```typescript
class CreateWithdrawalDto {
  // Any supported provider
  @IsMobileMoneyProvider()
  provider: string;
}

class CIWithdrawalDto {
  // Only providers available in Côte d'Ivoire
  @IsMobileMoneyProvider({ country: WAEMUCountry.COTE_IVOIRE })
  provider: string; // orange_money, mtn_momo, wave, moov_money
}

class QuickTransferDto {
  // Limit to specific providers
  @IsMobileMoneyProvider({
    allowedProviders: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.WAVE
    ]
  })
  provider: string;
}
```

**Options:**
```typescript
interface MobileMoneyProviderOptions {
  allowedProviders?: MobileMoneyProvider[];
  country?: WAEMUCountry;
}
```

**Examples:**
```typescript
// Valid providers
'orange_money'
'mtn_momo'
'wave'
'moov_money'

// Invalid
'invalid_provider'
'free_money'  // In CI (not available)
'mtn_momo'    // In SN (not available)
```

---

### @IsWAEMUCountry

Validates WAEMU (West African Economic and Monetary Union) country codes.

**Supported Countries:**
- BJ: Benin
- BF: Burkina Faso
- CI: Côte d'Ivoire (Ivory Coast)
- GW: Guinea-Bissau
- ML: Mali
- NE: Niger
- SN: Senegal
- TG: Togo

**Usage:**

```typescript
class CreateAccountDto {
  // Accept both codes and names
  @IsWAEMUCountry()
  country: string; // 'CI', 'SN', 'Senegal', 'Côte d'Ivoire', etc.
}

class RegistrationDto {
  // ISO codes only
  @IsWAEMUCountry({ acceptNames: false })
  countryCode: string; // Only 'CI', 'SN', 'ML', etc.
}

class OnboardingDto {
  // Limit to specific countries
  @IsWAEMUCountry({
    allowedCountries: [
      WAEMUCountry.COTE_IVOIRE,
      WAEMUCountry.SENEGAL
    ]
  })
  country: string;
}
```

**Options:**
```typescript
interface WAEMUCountryOptions {
  allowedCountries?: WAEMUCountry[];
  acceptNames?: boolean; // Default: true
}
```

**Examples:**
```typescript
// Valid country codes
'CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GW'

// Valid country names (case-insensitive)
'senegal', 'Senegal', 'Sénégal'
'cote d\'ivoire', 'Côte d\'Ivoire', 'ivory coast'
'mali', 'Mali'

// Invalid
'FR'     // Not WAEMU
'GH'     // Ghana, not in WAEMU
'france' // Not WAEMU
```

---

## Helper Functions

### getPhoneCodeForCountry

Get phone code for a WAEMU country.

```typescript
import { getPhoneCodeForCountry, WAEMUCountry } from '@/common/decorators/validation';

const phoneCode = getPhoneCodeForCountry(WAEMUCountry.COTE_IVOIRE);
// Returns: '+225'
```

### phoneMatchesCountry

Validate that a phone number matches a country.

```typescript
import { phoneMatchesCountry, WAEMUCountry } from '@/common/decorators/validation';

const isValid = phoneMatchesCountry('+2250123456789', WAEMUCountry.COTE_IVOIRE);
// Returns: true

const isInvalid = phoneMatchesCountry('+221771234567', WAEMUCountry.COTE_IVOIRE);
// Returns: false (Senegal number, not CI)
```

---

## Complete DTO Examples

### Transfer DTO

```typescript
import {
  IsPhoneE164,
  IsXOFAmount,
  IsMobileMoneyProvider,
  IsWAEMUCountry,
} from '@/common/decorators/validation';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTransferDto {
  @IsPhoneE164()
  @IsNotEmpty()
  recipientPhone: string;

  @IsXOFAmount()
  amount: number;

  @IsWAEMUCountry()
  country: string;

  @IsOptional()
  @IsString()
  note?: string;
}
```

### Mobile Money Withdrawal DTO

```typescript
export class CreateMobileMoneyWithdrawalDto {
  @IsXOFAmount({ checkMobileMoneyLimits: true })
  amount: number;

  @IsMobileMoneyProvider()
  provider: string;

  @IsPhoneE164()
  phoneNumber: string;

  @IsWAEMUCountry({ acceptNames: false })
  countryCode: string;
}
```

### Country-Specific Transfer DTO

```typescript
export class CoteDIvoireTransferDto {
  @IsPhoneE164()
  recipientPhone: string;

  @IsXOFAmount({ min: 1000, max: 500_000 })
  amount: number;

  @IsMobileMoneyProvider({
    country: WAEMUCountry.COTE_IVOIRE
  })
  provider: string;

  @IsWAEMUCountry({
    allowedCountries: [WAEMUCountry.COTE_IVOIRE]
  })
  country: string;
}
```

---

## Testing

Each decorator has comprehensive unit tests. Run tests with:

```bash
npm run test -- decorators/validation
```

Test coverage includes:
- Valid and invalid inputs
- Edge cases
- Country-specific validation
- Custom options
- Helper functions

---

## Business Rules

### XOF Currency
- No subunits (no cents) - amounts must be whole numbers
- Standard range: 100 - 2,000,000 XOF
- Mobile money limit: 500,000 XOF per transaction
- Exchange rate: ~625 XOF = 1 USD (approximate)

### Mobile Money Providers
- Provider availability varies by country
- Each country has 2-4 active providers
- Orange Money has widest coverage (6 countries)
- Wave is growing (CI, SN)

### WAEMU Region
- 8 member countries
- Common currency: CFA Franc (XOF)
- Phone number formats vary by country
- All use E.164 format with country-specific digits

---

## Error Messages

The decorators provide clear, localized error messages:

```typescript
// Phone validation error
"phone must be a valid E.164 phone number from a West African country (WAEMU region).
Supported countries: Côte d'Ivoire (+225), Senegal (+221), Mali (+223), ..."

// XOF amount error
"amount must be a valid XOF amount (whole number between 100 and 2,000,000 XOF).
Zero amounts not allowed"

// Provider error
"provider must be a valid mobile money provider for CI.
Allowed providers: orange_money, mtn_momo, wave, moov_money"

// Country error
"country must be a valid WAEMU country code.
Allowed countries: BJ (benin), BF (burkina faso), CI (côte d'ivoire), ..."
```

---

## Notes

- All validators are case-insensitive where appropriate
- Phone numbers must be in E.164 format (no spaces, dashes, parentheses)
- Provider names use snake_case
- Country codes follow ISO 3166-1 alpha-2 standard
- Validators trim whitespace automatically

---

## Contributing

When adding new validators:
1. Create validator in `/validation` directory
2. Add comprehensive unit tests
3. Export from `index.ts`
4. Update this README
5. Update backend templates if needed

---

## License

Internal JoonaPay library - not for public distribution.
