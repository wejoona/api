# Changelog - West African Validation Decorators

All notable changes to the West African validation decorators library.

## [1.0.0] - 2026-01-30

### Added

#### Core Validators
- **@IsPhoneE164**: E.164 phone number validation with West African patterns
  - Supports all 8 WAEMU countries
  - Strict mode for West African numbers only
  - Non-strict mode for international numbers
  - Country-specific digit count validation

- **@IsXOFAmount**: XOF (CFA Franc) amount validation
  - Whole number validation (no subunits)
  - Configurable min/max ranges
  - Mobile money limits enforcement (500K XOF)
  - Support for refunds (negative amounts)
  - Zero amount control

- **@IsMobileMoneyProvider**: Mobile money provider validation
  - 6 supported providers (Orange Money, MTN, Wave, Moov, Free, YUP)
  - Country-specific availability checking
  - Custom provider filtering
  - Case-insensitive matching

- **@IsWAEMUCountry**: WAEMU country code validation
  - 8 WAEMU member countries
  - Both ISO codes and country names
  - Country-specific filtering
  - Phone code metadata

#### Helper Functions
- `getPhoneCodeForCountry()`: Get phone code for WAEMU country
- `phoneMatchesCountry()`: Validate phone matches country code

#### Documentation
- Comprehensive README with usage examples
- Quick start guide (QUICKSTART.md)
- 15 real-world DTO examples (examples.dto.ts)
- Full API documentation
- Business rules reference

#### Testing
- 135 unit tests across all validators
- Edge case coverage
- Country-specific validation tests
- Helper function tests
- 100% test coverage

### Features

#### Phone Validation
- Côte d'Ivoire: +225 (10 digits)
- Senegal: +221 (9 digits)
- Mali: +223 (8 digits)
- Burkina Faso: +226 (8 digits)
- Niger: +227 (8 digits)
- Togo: +228 (8 digits)
- Benin: +229 (8 digits)
- Guinea-Bissau: +245 (7 digits)

#### XOF Amount Rules
- Default range: 100 - 2,000,000 XOF
- No decimal places (whole numbers only)
- Mobile money single transaction: 500,000 XOF max
- Configurable limits per use case
- Refund support

#### Mobile Money Providers
- Orange Money: CI, SN, ML, BF, NE, GW
- MTN Mobile Money: CI, BJ
- Wave: CI, SN
- Moov Money: CI, ML, BF, NE, TG, BJ
- Free Money: SN
- YUP: TG

#### Country Support
- All 8 WAEMU countries
- ISO 3166-1 alpha-2 codes
- Multiple name variations
- French accent support
- Phone code mapping

### Technical Details

#### Dependencies
- class-validator: ^0.14.3
- TypeScript: Strict mode compatible
- NestJS: Full integration

#### Architecture
- Custom validator constraints
- Decorator pattern
- Type-safe with TypeScript
- Extensible design
- Zero runtime dependencies beyond class-validator

#### Performance
- Fast validation (no async operations)
- Minimal memory footprint
- No external API calls
- Regex-based pattern matching

### Integration

#### Import Paths
```typescript
import {
  IsPhoneE164,
  IsXOFAmount,
  IsMobileMoneyProvider,
  IsWAEMUCountry,
} from '@/common/decorators/validation';
```

#### Export Structure
All validators exported from main decorators index:
```typescript
import { IsPhoneE164 } from '@/common/decorators';
```

### Testing Results

```
Test Suites: 4 passed, 4 total
Tests:       135 passed, 135 total
Time:        ~3.5s
Coverage:    100%
```

### File Structure

```
validation/
├── index.ts                                      # Main exports
├── is-phone-e164.decorator.ts                    # Phone validator
├── is-phone-e164.decorator.spec.ts              # Phone tests
├── is-xof-amount.decorator.ts                    # Amount validator
├── is-xof-amount.decorator.spec.ts              # Amount tests
├── is-mobile-money-provider.decorator.ts         # Provider validator
├── is-mobile-money-provider.decorator.spec.ts   # Provider tests
├── is-waemu-country.decorator.ts                 # Country validator
├── is-waemu-country.decorator.spec.ts           # Country tests
├── examples.dto.ts                               # Usage examples
├── README.md                                     # Full documentation
├── QUICKSTART.md                                 # Quick start guide
└── CHANGELOG.md                                  # This file
```

### Lines of Code

- Total TypeScript: ~900 lines
- Total Tests: ~1,400 lines
- Total Documentation: ~800 lines
- **Total Library: ~3,100 lines**

### Known Limitations

1. **Phone Validation**
   - Only validates format, not if number actually exists
   - Côte d'Ivoire pattern assumes post-2021 10-digit format

2. **XOF Amounts**
   - Mobile money limits are typical values, may vary by provider
   - Daily/monthly limits not enforced (single transaction only)

3. **Provider Validation**
   - Provider availability may change (requires manual updates)
   - No real-time availability checking

4. **Country Validation**
   - Limited to WAEMU countries only
   - No support for other West African countries (Ghana, Nigeria, etc.)

### Future Enhancements

Potential features for future versions:
- Real-time provider availability checking
- Dynamic limit configuration
- Support for other West African regions (ECOWAS)
- Phone number existence verification
- Multi-currency support
- Transaction limit enforcement (daily/monthly)
- Provider-specific validation rules

### Migration Guide

Not applicable (initial release).

### Breaking Changes

Not applicable (initial release).

### Contributors

- JoonaPay Engineering Team

### License

Internal JoonaPay library - not for public distribution.

---

## Version Guidelines

- **Major version (X.0.0)**: Breaking changes, incompatible API changes
- **Minor version (0.X.0)**: New features, backward compatible
- **Patch version (0.0.X)**: Bug fixes, backward compatible

---

Last updated: 2026-01-30
