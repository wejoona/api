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
- [ ] Phone number verification via OTP

### High
- [ ] Database schema separation (`api`, `backoffice`, `providers` schemas)
- [ ] Enable TypeScript strict mode (162 errors to fix)

### Medium
- [ ] Increase test coverage to 70%

---

## Mobile App (`/mobile`)

### Critical
- [ ] Replace certificate pinning placeholders
- [ ] Configure FCM production credentials
- [ ] Replace Firebase placeholder configs

### High
- [ ] Navigation animations (contextual transitions)
- [ ] Select/dropdown styling improvements
- [ ] Migrate remaining views to i18n

### Medium
- [ ] Fix 9 biometric test mocks
- [ ] Feature flags for non-MVP features

---

## Dashboard (`/dashboard`)

### High
- [ ] Real-time transaction monitoring
- [ ] KYC document review workflow

---

*Last updated: 2026-01-26*
