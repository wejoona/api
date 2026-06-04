# Korido API/Backend Readiness Objectives - Pass 8

Purpose: continue API/backend readiness for internal dogfooding with mobile screens connected to real backend capability. This pass prioritizes contracts that prevent fake mobile data, auth/session surprises, and unsupported feature buttons from silently doing nothing.

## Auth, VerifyHQ, And Sessions

- [x] Confirm login/register/OTP contracts support the VerifyHQ-backed dev path with `123456` OTP while keeping SMS delivery mockable only at the sender boundary.
- [x] Confirm active-session list/revoke endpoints are mobile-safe for authenticated users and return stable 401/403 envelopes for expired or unauthorized requests.
- [x] Confirm refresh/logout/logout-all responses remain stable when the session store or refresh-token path is unavailable.

## Mobile Data Truthfulness

- [x] Confirm transaction list/detail contracts expose enough backend fields for mobile to remove fake transaction history and success-detail data.
- [x] Confirm wallet balance/readiness responses identify data source, stale/degraded state, and provider-unavailable reasons.
- [x] Confirm contact discovery contracts stay scoped to requested contacts and requester visibility, with no whole-address-book leakage.

## Feature Subscriptions And Notifications

- [x] Add contract coverage for feature subscriptions so “stay informed” buttons store `featureKey`, `source`, user identity, and regional metadata.
- [x] Confirm notification feed, unread count, mark-read, read-all, and push-token endpoints share one stable mobile contract.
- [x] Confirm notification and feature-subscription errors include support-safe retry/review metadata where a dependency is unavailable.

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

### Wallet Balance Readiness Contract - 2026-06-04

Status: complete.

Verified:

- `GET /wallet` identifies the balance source with `source`, `sourceOfTruth`, `readStatus`, `isStale`, `degraded`, and `warning`.
- Fresh ledger reads are marked `source=ledger`, `sourceOfTruth=blnk`, `readStatus=fresh`, `isStale=false`, and `degraded=false`.
- Blnk/provider-unavailable fallback is marked `source=local_mirror`, `sourceOfTruth=local_mirror`, `readStatus=degraded`, `isStale=true`, and `degraded=true`.
- Cached degraded balances are marked `readStatus=cached_degraded`.
- Decimal-safe balance fields remain required for mobile display.

Verification:

- `npm test -- --runInBand src/modules/wallet/application/usecases/get-balance.use-case.spec.ts`
- `npm run test:contracts -- --runInBand --testPathPatterns="wallet.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="wallet.controller"`

### Contact Discovery Scope And Privacy - 2026-06-04

Status: complete.

Verified and hardened:

- `POST /contacts/check` accepts scoped hashed phone lookup through `phoneHashes`.
- Deprecated raw `phoneNumbers` are hashed immediately for compatibility and are not returned.
- Denied or unavailable contact permission is now enforced server-side: the API returns no matches and does not query users even if a buggy client submits hashes.
- Empty batches do not query users.
- Results are limited to active verified users found from the submitted hashes.
- The current user is excluded from matches.
- Responses return `phoneHash`, `maskedPhone`, `userId`, `displayName`, `avatarUrl`, and `isKoridoUser`; raw phone numbers are not returned.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="contact.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="contact.controller"`

### Notification Mobile Contract - 2026-06-04

Status: complete.

Verified and hardened:

- Notification feed returns stable presentation fields for mobile list rendering and taps: `presentationType`, `severity`, `action`, `status`, timestamps, reference metadata, and `isUnread`.
- Unread count supports the mobile-compatible `/notifications/unread-count` alias.
- Mark-one-read and mark-all-read return deterministic no-content responses.
- Push token registration is documented and verified at `/notifications/push/token`.
- Push token removal and remove-all-token cleanup are now documented and covered through the canonical `NotificationController`.
- The duplicate `PushNotificationController` is no longer registered in the module controller list, removing route-order ambiguity for `/notifications/push/token`.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="notification.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="notification.controller|push-notification.controller"`

### Notification And Feature Subscription Dependency Errors - 2026-06-04

Status: complete.

Verified and hardened:

- Unexpected notification-store failures return a mobile-safe `503` envelope with `code=NOTIFICATION_DEPENDENCY_UNAVAILABLE`.
- Unexpected feature-subscription-store failures return a mobile-safe `503` envelope with `code=FEATURE_SUBSCRIPTION_DEPENDENCY_UNAVAILABLE`.
- Error metadata includes `dependency`, `retryable=true`, and `supportReviewRequired=false`.
- Intentional HTTP exceptions are preserved instead of being rewritten as dependency failures.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="notification.contract|feature-subscription.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="notification.controller|feature-subscription.controller"`
