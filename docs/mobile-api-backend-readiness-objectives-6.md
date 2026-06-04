# Korido API/Backend Readiness Objectives - Pass 6

Purpose: continue API/backend readiness after mobile smoke, schema repair, job health, dependency degradation, and audit/risk hardening. This pass focuses on remaining backend behaviors that can still surprise a mobile dogfood build.

## Auth, Session, And Logout Resilience

- [x] Confirm login, OTP, refresh-token, logout, logout-all, active sessions, and device revoke return stable mobile error envelopes when Redis or session storage is unavailable.
- [x] Confirm Redis-dependent token invalidation fails closed for logout/logout-all without corrupting local session state.
- [x] Confirm the active-session screen cannot produce an unclassified 401 when the access token is valid and the refresh token is recoverable.

## Wallet Read Model And Balance Truth

- [x] Confirm balance reads clearly identify Blnk source-of-truth, cached, and local fallback states for mobile.
- [x] Confirm local fallback balance is marked degraded/stale and cannot be mistaken for final ledger truth.
- [x] Confirm transaction history, payment links, and wallet summaries share consistent amount/currency precision and support references.

## Rates, Regions, And Provider Feature Flags

- [x] Replace or clearly classify `/health/exchange-rates` fallback data so mobile never treats static rates as live executable quotes.
- [x] Confirm CI and US feature availability is derived from config/profile/app-config data instead of hardcoded Orange/Wave/Ivory Coast assumptions.
- [x] Confirm disabled providers return deterministic `provider_or_feature_disabled` states across deposits, withdrawals, cards, bank linking, and bill pay.

## Risk Client Modes And Production Safety

- [x] Review `RiskClientFactory` live/mock/hybrid behavior so production cannot silently fall back to mock risk screening.
- [ ] Confirm address screening and transaction risk fail closed when live compliance providers are enabled but unavailable.
- [x] Confirm mock risk/client modes are explicit dev/test modes and visible in readiness/admin metadata.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Prove current behavior with unit, contract, e2e, or live local HTTP smoke.
3. Fix the backend/API boundary with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Auth, Session, And Logout Resilience - 2026-06-04

Verified and hardened:

- Added `E1009 AUTH_SESSION_STORE_UNAVAILABLE` for Redis/session-store outages that affect token refresh or revocation.
- `POST /auth/refresh` now returns a mobile-safe 503 envelope when Redis is unavailable instead of collapsing the outage into a misleading 401 invalid-token state.
- `POST /auth/logout` now fails closed with `E1009` if refresh-token revocation cannot be persisted.
- `POST /auth/logout-all` now fails closed with `E1009` if global token invalidation cannot be persisted.
- Active sessions endpoint coverage confirms:
  - valid access token returns the mobile-compatible session list.
  - expired/invalid access token returns a classified 401 envelope with `UNAUTHORIZED` and `Invalid or expired token`, not an unclassified error.
- Existing device/session revoke coverage confirms stable success and forbidden envelopes for session ownership errors.

Verification:

- `npm test -- --runInBand src/modules/user/application/domain/usecases/logout.usecase.spec.ts src/modules/user/application/domain/usecases/logout-all.usecase.spec.ts src/modules/user/application/domain/usecases/refresh-token.usecase.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="auth.controller|session.controller"`

### Wallet Balance Source Semantics - 2026-06-04

Verified and hardened:

- Wallet balance responses now include explicit source metadata:
  - `source`: `ledger` or `local_mirror`.
  - `sourceOfTruth`: `blnk` or `local_mirror`.
  - `readStatus`: `fresh`, `cached`, `degraded`, or `cached_degraded`.
  - `isStale`, `degraded`, and mobile-safe `warning`.
- Fresh Blnk reads return `source=ledger`, `sourceOfTruth=blnk`, `readStatus=fresh`, `isStale=false`, `degraded=false`.
- Cached ledger reads return `readStatus=cached`.
- Blnk-unavailable and missing-ledger-balance fallback reads return `source=local_mirror`, `readStatus=degraded`, `isStale=true`, `degraded=true`, and a warning so mobile cannot mistake local mirror data for final ledger truth.
- Cached local mirror fallback reads return `readStatus=cached_degraded`.
- Wallet contract tests now require this metadata for mobile compatibility.

Verification:

- `npm test -- --runInBand src/modules/wallet/application/usecases/get-balance.use-case.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="wallet.controller"`
- `npm run test:contracts -- --runInBand --testPathPatterns="wallet.contract"`

### Transaction And Payment Reference Consistency - 2026-06-04

Verified and hardened:

- Transaction list/detail responses now expose provider-neutral reference fields:
  - `supportReference`: stable support-facing transaction id.
  - `ledgerReference`: Blnk/internal ledger reference when available.
  - `providerReference`: external provider/on-chain reference when available.
- Legacy `yellowCardRef` remains for backwards compatibility, but new mobile clients no longer need Yellow Card-specific naming.
- Payment-link pay responses now include `amountDecimal` and `currency` alongside `supportReference`, `ledgerReference`, and optional `ledgerTransactionId`.
- Wallet transfer/deposit responses already expose decimal-safe amount/fee fields and support references; this pass aligns transaction history and payment-link success responses with that shape.

### Health Exchange Rate Classification - 2026-06-04

Verified and hardened:

- `/health/exchange-rates` now returns machine-readable fallback metadata:
  - `quoteStatus=indicative_fallback`
  - `executable=false`
  - `validForExecution=false`
  - `live=false`
  - `stale=true`
  - `source=static_fallback`
  - `reason=exchange_rate_provider_not_connected`
- Each returned rate also carries `source=static_fallback` and `executable=false`.
- Health remains diagnostic only; executable quotes must come from wallet/provider quote endpoints.

### Region App Config Source - 2026-06-04

Verified and hardened:

- `/config/countries` remains the backend-owned mobile source of truth for market rails.
- Default country config includes:
  - CI: XOF, `fr-CI`, `west_africa`, mobile money + USDC, Orange/MTN/Wave.
  - US: USD, `en-US`, `north_america`, USDC-only by default, no mobile money providers.
- The endpoint now supports deployment-driven overrides via `app.supportedCountries` or `SUPPORTED_COUNTRIES_JSON`.
- E2E coverage proves US rails can be changed to `usdc + bank` from backend config without mobile hardcoding.

### Disabled Provider Semantics - 2026-06-04

Verified and hardened:

- Disabled provider/feature states now expose `reason=provider_or_feature_disabled` consistently.
- Feature-specific details remain available in `featureReason`:
  - Yellow Card deposit/withdraw: `yellow_card_disabled`.
  - Cards: `card_issuing_unavailable`.
  - Bank linking: `bank_linking_unavailable`.
  - Bill pay: `bill_pay_unavailable`.
- List/capability endpoints return stable unavailable states instead of empty data with ambiguous reason strings.
- Mutating endpoints return coded mobile envelopes with the same generic reason plus feature-specific context.

### Risk Client Mode Safety - 2026-06-04

Verified and hardened:

- `RiskClientFactory` no longer silently falls back to mock for invalid modes in production-like environments.
- Production and staging default to `live`; development and test default to `mock`.
- `mock` and `hybrid` modes are rejected in production-like environments.
- Live mode fails fast in production-like environments unless `RISK_MANAGER_URL` and a non-dev `RISK_MANAGER_API_KEY` are configured.
- Hybrid fallback remains available only outside production-like environments.
- `/health/mobile-readiness` now exposes risk mode metadata:
  - `mode`, `configuredMode`, `managerEnabled`, `productionLike`, `mockAllowed`, `fallbackAllowed`, `liveConfigured`, and `status`.
- The readiness response reports misconfiguration without leaking the API key.

Verification:

- `npm test -- --runInBand src/modules/risk/infrastructure/risk-client.factory.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`
