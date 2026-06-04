# Korido API/Backend Readiness Objectives - Pass 8

Purpose: continue API/backend readiness for internal dogfooding with mobile screens connected to real backend capability. This pass prioritizes contracts that prevent fake mobile data, auth/session surprises, and unsupported feature buttons from silently doing nothing.

## Auth, VerifyHQ, And Sessions

- [x] Confirm login/register/OTP contracts support the VerifyHQ-backed dev path with `123456` OTP while keeping SMS delivery mockable only at the sender boundary.
- [x] Confirm active-session list/revoke endpoints are mobile-safe for authenticated users and return stable 401/403 envelopes for expired or unauthorized requests.
- [x] Confirm refresh/logout/logout-all responses remain stable when the session store or refresh-token path is unavailable.

## Mobile Data Truthfulness

- [x] Confirm transaction list/detail contracts expose enough backend fields for mobile to remove fake transaction history and success-detail data.
- [ ] Confirm wallet balance/readiness responses identify data source, stale/degraded state, and provider-unavailable reasons.
- [ ] Confirm contact discovery contracts stay scoped to requested contacts and requester visibility, with no whole-address-book leakage.

## Feature Subscriptions And Notifications

- [x] Add contract coverage for feature subscriptions so “stay informed” buttons store `featureKey`, `source`, user identity, and regional metadata.
- [ ] Confirm notification feed, unread count, mark-read, read-all, and push-token endpoints share one stable mobile contract.
- [ ] Confirm notification and feature-subscription errors include support-safe retry/review metadata where a dependency is unavailable.

## Region-Aware Mobile Configuration

- [ ] Confirm app config can describe Abidjan/USA availability, rails, and feature flags without hardcoded mobile assumptions.
- [ ] Confirm payment/deposit/withdrawal options are returned from backend capability data, not static Côte d'Ivoire-only UI state.

## Recursive Execution Rule

1. Pick the first unchecked item with a concrete backend/API gap.
2. Prove current behavior with unit, contract, e2e, or local HTTP smoke.
3. Patch the API boundary or contract with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Feature Subscription Contract Coverage - 2026-06-04

Status: complete.

Target:

- `POST /feature-subscriptions` accepts feature key, source screen, optional status, phone, email, and metadata.
- `GET /feature-subscriptions` returns paginated current-user subscriptions.
- Mobile can subscribe to a specific future feature such as `virtual_card` without losing region/locale/source context.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="feature-subscription.contract"`

### OTP Dev Path Production Guard - 2026-06-04

Status: complete.

Verified and hardened:

- Local verification already uses fixed `123456` only in development/test or non-production explicit dev mode.
- Production startup validation now rejects `OTP_USE_DEV_OTP=true`.
- Production startup validation now rejects `OTP_DEBUG_LOGGING=true`.
- Auth contract examples continue documenting the six-digit `123456` dev/test OTP shape without allowing production fixed OTP.

Verification:

- `npm test -- --runInBand src/config/environments/index.spec.ts`

### Transaction Display Contract Coverage - 2026-06-04

Status: complete.

Verified and hardened:

- Transaction responses now include stable top-level mobile display fields:
  - `description`
  - `counterpartyName`
  - `counterpartyPhone`
  - `direction`
  - `externalReference`
- Metadata remains intact for detail views and support/audit context.
- Contract coverage now requires these fields on transaction list/detail responses.
- Controller e2e verifies internal-transfer metadata is projected into mobile-safe top-level fields.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="transaction.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="transaction.controller"`

### Active Session Contract Alignment - 2026-06-04

Status: complete.

Verified and hardened:

- `GET /sessions` now returns an explicit list envelope with `sessions`, `items`, and `total`.
- `GET /sessions/all` uses the same envelope for inactive/revoked-inclusive history.
- Mobile compatibility is preserved because the current sessions repository reads the `sessions` key.
- Contract coverage now validates the session list envelope.
- Controller e2e verifies list 401, revoke 401, and revoke 403 error envelopes.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="device-session.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="session.controller"`

### Auth Session Store Error Contract - 2026-06-04

Status: complete.

Verified and hardened:

- Refresh, logout, and logout-all already return mobile-safe 503 envelopes when session storage is unavailable.
- Auth contracts now include `AuthSessionStoreUnavailable` for `E1009`.
- The contract requires stable `success=false`, `error.code`, and `error.message` so mobile can show predictable retry/session messaging.
- Existing auth controller e2e covers 503 behavior for refresh/logout/logout-all.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="auth.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="auth.controller"`
