# JoonaPay USDC Wallet - TODO

> Remove items when completed. Keep focused on actionable work.

---

## Backend API (`/usdc-wallet`)

### Critical
- [ ] Configure production provider credentials in `.env`:
  - `CIRCLE_API_KEY`, `CIRCLE_USE_MOCK=false`
  - `YELLOW_CARD_API_KEY`, `YELLOW_CARD_USE_MOCK=false`
- [ ] Configure SMS provider (Twilio) for OTP delivery
- [ ] Disable `useDevOtp` in production config
- [ ] **Phone number verification via OTP** - Verify phone ownership before allowing sensitive actions

### High
- [ ] Enable TypeScript strict mode in `tsconfig.json` (162 errors to fix)
  - `strictNullChecks: true`
  - `noImplicitAny: true`
- [ ] **Database schema separation** - Separate schemas for better access control & future scaling:
  - `api` schema - Mobile app data (users, wallets, transactions)
  - `backoffice` schema - Admin/dashboard data (audit logs, settings)
  - `providers` schema - External provider data (Circle, Yellow Card, Blnk)
  - Benefits:
    - Lighter DB connections (only load needed schemas)
    - Easier access control (grant per-schema)
    - Future microservice extraction ready
    - Multiple connectors (API vs Dashboard) with different permissions

### Medium
- [ ] Increase test coverage to 70% (currently ~20%)
  - Add webhook handler tests
  - Add rate limiting tests
  - Add transfer flow integration tests

### Low
- [ ] Refactor `yellow-card.service.ts` (647 lines)
- [ ] Clean up unused imports

---

## Mobile App (`/mobile`)

### Critical
- [ ] Replace certificate pinning placeholders in `lib/services/security/certificate_pinning.dart:63-68`
  ```bash
  openssl s_client -servername api.joonapay.com -connect api.joonapay.com:443 </dev/null 2>/dev/null | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```
- [ ] Configure FCM production credentials for push notifications
- [ ] Replace Firebase placeholder configs with production credentials

### High - UI/UX Improvements

#### Navigation & Structure
- [ ] **Navigation animations** - Use sitemap to pick contextual transitions (slide, fade based on hierarchy)

#### Select/Dropdown Fields
- [ ] **Selected state** - Clear highlight for selected option
- [ ] **Dropdown styling** - Match design system colors

#### Internationalization (i18n)
- [ ] **Migrate remaining views** - Apply l10n to all screens (see LOCALIZATION_MIGRATION_CHECKLIST.md)
- [ ] **RTL consideration** - Structure for future Arabic/Hebrew support

### Medium
- [ ] Fix 9 biometric test mocks in `test/services/biometric_service_test.dart`
- [ ] Increase test coverage for critical flows
- [ ] Feature flags for non-MVP features (hide until ready)

### Low
- [ ] Remove debug print statements from release builds

---

## Dashboard (`/dashboard`)

### Critical
- [ ] Configure database connection to use `backoffice` schema (after schema separation)

### Medium
- [ ] Add real-time transaction monitoring dashboard
- [ ] Add KYC document review workflow

---

## Architecture

### Database Schema Separation Plan
```
PostgreSQL
├── api (schema)
│   ├── users
│   ├── wallets
│   ├── transactions
│   ├── kyc_documents
│   └── notifications
├── backoffice (schema)
│   ├── admins
│   ├── audit_logs
│   ├── compliance_alerts
│   └── admin_notifications
└── providers (schema)
    ├── blnk_ledgers
    ├── blnk_balances
    ├── circle_wallets
    └── yellowcard_transactions
```

---

## Recently Completed (2026-01-26)

### Mobile UI/UX
- ✅ Handle null wallet gracefully
- ✅ Simplify home page (balance, 3 quick actions, recent transactions)
- ✅ Services page with categorized grid
- ✅ Back button gold color in settings
- ✅ Theme toggle (Light/Dark/System)
- ✅ Default currency USDC
- ✅ AppInput states (default, focused, filled, error, disabled)
- ✅ AppButton text alignment & overflow
- ✅ Internationalization setup (EN/FR with ARB files)
- ✅ Language switcher in settings

---

*Last updated: 2026-01-26*
