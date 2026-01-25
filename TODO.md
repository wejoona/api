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
- [ ] **Handle null wallet gracefully** - Better UX when wallet isn't present or wallet ID is null

### High - UI/UX Improvements

#### Navigation & Structure
- [ ] **Create app sitemap** - Clear page hierarchy for better navigation decisions
  ```
  /login → /otp → /home
  /home
    ├── /wallet (balance, recent transactions)
    ├── /services (all services in dedicated page)
    │   ├── /send
    │   ├── /receive
    │   ├── /bill-payments
    │   ├── /merchant-pay
    │   └── /virtual-card
    ├── /transactions (history)
    └── /settings
        ├── /profile
        ├── /security
        ├── /theme (light/dark/system)
        ├── /language (EN/FR)
        └── /notifications
  ```
- [ ] **Simplify home page** - Too crowded, keep only essential:
  - Balance card
  - Quick actions (Send, Receive, Scan)
  - Recent transactions (3-5 max)
  - Link to Services page for everything else
- [ ] **Services page** - Move non-essential services out of home
- [ ] **Navigation animations** - Use sitemap to pick contextual transitions

#### Design System Enhancements
- [ ] **Back button color** - Settings back button should be gold/yellow (`AppColors.gold500`), not gray/black
- [ ] **Theme toggle** - Clear menu to switch: Light / Dark / System
- [ ] **Default currency** - USDC as default

#### Input Fields - Define all states
- [ ] **AppTextField** - Enhance with explicit states:
  ```dart
  // States to define:
  - default: bg, border, text color
  - focused: bg, border (gold), text color
  - hover: bg, border highlight
  - filled: bg tint, border
  - error: bg, border (red), error text
  - disabled: bg (muted), text (gray)
  ```

#### Buttons - Fix alignment & sizing
- [ ] **Button text alignment** - Center text properly in all button variants
- [ ] **Button text overflow** - Handle long text (ellipsis or wrap)
- [ ] **Action button consistency** - Same padding, height across app

#### Select/Dropdown Fields
- [ ] **Selected state** - Clear highlight for selected option
- [ ] **Dropdown styling** - Match design system colors

#### Internationalization (i18n)
- [ ] **Setup flutter_localizations** - English (default) + French
- [ ] **Create ARB files**:
  - `lib/l10n/app_en.arb`
  - `lib/l10n/app_fr.arb`
- [ ] **Language switcher** - In settings, persist preference
- [ ] **RTL consideration** - Not needed for EN/FR but structure for future

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

*Last updated: 2026-01-25*
