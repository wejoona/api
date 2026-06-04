# Korido API/Backend Readiness Objectives - Pass 4

Purpose: move from hardened mobile contracts into operational backend readiness for internal dogfooding and pilot preparation.

## Live Flow Integration

- [x] Verify local Korido API + VerifyHQ dev OTP path boots and supports register, login, verify OTP, session, wallet, and readiness smoke with real HTTP calls.
- [x] Confirm auth/session refresh/logout/logout-all flows return deterministic mobile-safe envelopes under expired, revoked, and missing-device conditions.
- [x] Confirm KYC and liveness flows expose clear pending, manual-review, approved, rejected, and dependency-unavailable states.

## Ledger And Reconciliation Operations

- [x] Confirm every money-moving route emits enough ledger identifiers for support to reconcile a user complaint without exposing provider secrets.
- [x] Confirm reconciliation jobs can be observed through CronHub-compatible status without requiring in-process-only inspection.
- [x] Confirm failed ledger/provider settlement paths surface actionable support metadata while preserving mobile-safe errors.

## Data And Migration Safety

- [ ] Confirm migrations cover the entities touched by mobile dogfooding features and detect drift against a clean database.
- [ ] Confirm seed/dev bootstrap creates only safe test fixtures and does not leak production-like secrets.
- [ ] Confirm indexes exist for high-frequency mobile queries: contacts lookup, transactions history, sessions/devices, notifications, and audit logs.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Prove the current behavior with a smoke, unit, contract, e2e, or schema check.
3. Fix the API/backend boundary with the smallest durable change.
4. Run focused verification, then `npm run verify:backend:mobile` for mobile-facing changes.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Live Flow Integration - 2026-06-04

Verified against local real HTTP dependencies:

- VerifyHQ: `http://127.0.0.1:3300/health` returned `ok`.
- Korido API: booted on `http://127.0.0.1:3401/api/v1` with VerifyHQ strategy, local Postgres, local Redis, and local Blnk on `http://127.0.0.1:5002`.
- `GET /health/mobile-readiness` returned `status=ready`, with database, Redis, and Blnk available.
- `POST /auth/register` accepted a fresh CI phone and returned OTP-sent success.
- `POST /auth/login` accepted the same phone and returned OTP-sent success.
- `POST /auth/verify-otp` accepted default OTP `123456` and returned access token, refresh token, user, expiry, and KYC status.
- `GET /sessions` returned the authenticated active session list.
- `GET /wallet` correctly returned `404 NOT_FOUND` before wallet creation.
- `POST /wallet/create` created an active USDC wallet.
- `GET /wallet/balance` returned a zero USDC balance from the local mirror.

Observed follow-up for the auth/session objective: `GET /sessions` returned `deviceId: null` even when the smoke sent `X-Device-ID`. That needs contract-level review before dogfooding device management can be considered complete.

### Auth And Session Contracts - 2026-06-04

Verified and hardened:

- `POST /devices/register` links the latest active session to the registered internal device UUID. `X-Device-ID` by itself is treated as an external client identifier and is not stored as the `auth.sessions.device_id` foreign key.
- `POST /auth/refresh` rotates refresh tokens and returns `401 UNAUTHORIZED` in the standard mobile-safe error envelope when the old refresh token is reused.
- `POST /auth/logout` now verifies refresh-token signature, token type, expiry, and user ownership before blacklisting. Forged unsigned refresh-token bodies now return `401 UNAUTHORIZED` instead of a false success.
- `POST /auth/logout` with a valid refresh token still returns the stable success response.
- `POST /auth/logout-all` returns stable success and invalidates existing refresh tokens; later refresh attempts return `401 UNAUTHORIZED` with the mobile-safe envelope.
- Expired/invalid access tokens on session routes are already covered by controller e2e tests and return `401 UNAUTHORIZED` with the standard envelope.

Verification:

- Focused unit: `npm test -- --runInBand src/modules/user/application/domain/usecases/logout.usecase.spec.ts`
- Live HTTP smoke against local Korido API + VerifyHQ confirmed forged logout rejection and logout-all invalidation.
- Full backend/mobile verifier: `npm run verify:backend:mobile`

### KYC And Liveness State Contracts - 2026-06-04

Verified and hardened:

- KYC status contracts already cover `none`, `documents_pending`, `pending_verification`, `manual_review`, `approved`, `auto_approved`, and `rejected`.
- `GET /kyc/liveness/status` no longer hides VerifyHQ failures as `NOT_STARTED`; provider failures now return `{ status: "DEPENDENCY_UNAVAILABLE", provider: "verifyhq", retryable: true }`.
- `GET /kyc/verification/status` includes the same dependency-unavailable state in the `verification` object while preserving the local KYC state.
- VerifyHQ-backed liveness/document commands now fail with a mobile-safe `503` envelope and code `E5005` (`KYC_PROVIDER_UNAVAILABLE`) when the provider is unavailable.
- `GET /liveness/:sessionId` now returns a proper mobile-safe `404 NOT_FOUND` envelope when the session is missing or expired instead of returning `200` with an error-like message.

Verification:

- Focused e2e: `npm run test:e2e -- --runInBand --testPathPatterns="kyc-verify.controller|liveness.controller"`
- Full backend/mobile verifier: `npm run verify:backend:mobile`

### Money Movement Reconciliation References - 2026-06-04

Verified and hardened:

- Internal transfer responses now include `supportReference`, `ledgerReference`, and `ledgerTransactionId`.
- External transfer and withdrawal responses now include `supportReference`, `ledgerReference`, `ledgerTransactionId`, and `providerReference`.
- Deposit initiation responses now include `supportReference`, `providerReference`, and `paymentReference`.
- Payment-link payment responses now include `supportReference`, `ledgerReference`, and `ledgerTransactionId`.
- Transfer DTO history/detail mapping exposes persisted support-safe reconciliation handles from local entity metadata where available.
- The response fields intentionally expose local transaction ids, generated ledger references, Blnk transaction ids, and provider external ids only. No provider secrets, omnibus wallet ids, API keys, or signing material are returned.

Verification:

- Focused unit: `npm test -- --runInBand src/modules/wallet/application/usecases/internal-transfer.use-case.spec.ts src/modules/wallet/application/usecases/external-transfer.use-case.spec.ts src/modules/wallet/application/usecases/initiate-deposit.use-case.spec.ts`
- Focused e2e: `npm run test:e2e -- --runInBand --testPathPatterns="wallet.controller|payment-link.controller"`
- Full backend/mobile verifier: `npm run verify:backend:mobile`

### CronHub-Compatible Reconciliation Job Status - 2026-06-04

Verified and hardened:

- `reconcile_blnk_balances` is now registered with the CronHub reporter; before this pass, the job called `pingStart`/`pingComplete` but had no registration entry, so the pings were no-ops.
- Added authenticated admin endpoint `GET /jobs/cronhub/status`.
- The endpoint maps local `scheduled_jobs` history into CronHub-compatible status vocabulary: `new`, `healthy`, `running`, `late`, and `missed`.
- The response includes job schedule, grace period, expected interval, last run id, last status, last heartbeat time, next expected time, duration, records processed, and failure reason.
- The endpoint can be filtered with `jobName=daily_reconciliation` or `jobName=reconcile_blnk_balances`.

Verification:

- Focused unit: `npm test -- --runInBand src/modules/jobs/services/scheduled-jobs.service.spec.ts`
- Focused e2e: `npm run test:e2e -- --runInBand --testPathPatterns="jobs.controller"`
- Full backend/mobile verifier: `npm run verify:backend:mobile`

### Failed Settlement Support Metadata - 2026-06-04

Verified and hardened:

- `AppException` can now carry safe context fields through the existing mobile-safe error envelope.
- Internal transfer ledger-recording failures return `E3008` with `supportReference`, `ledgerReference`, and `settlementStage=ledger_recording`.
- Payment-link ledger-recording failures return `E7007` with `supportReference`, `ledgerReference`, `paymentLinkId`, and `settlementStage=ledger_recording`.
- External withdrawal ledger-reservation failures return `E6006` with `supportReference`, `ledgerReference`, and `settlementStage=ledger_reservation`.
- External withdrawal provider-transfer failures return safe context with `supportReference`, `ledgerReference`, `ledgerTransactionId`, `settlementStage=provider_transfer`, and `settlementStatus`.
- If Blnk voiding fails after a provider transfer failure, the API no longer claims funds were refunded; it returns a review-needed mobile-safe message with `settlementStatus=void_failed`.

Verification:

- Focused unit: `npm test -- --runInBand src/common/filters/http-exception.filter.spec.ts src/modules/wallet/application/usecases/internal-transfer.use-case.spec.ts src/modules/wallet/application/usecases/external-transfer.use-case.spec.ts src/modules/payment-links/application/services/payment-link.service.spec.ts`
- Full backend/mobile verifier: `npm run verify:backend:mobile`
