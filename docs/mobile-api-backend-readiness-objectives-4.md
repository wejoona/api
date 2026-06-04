# Korido API/Backend Readiness Objectives - Pass 4

Purpose: move from hardened mobile contracts into operational backend readiness for internal dogfooding and pilot preparation.

## Live Flow Integration

- [x] Verify local Korido API + VerifyHQ dev OTP path boots and supports register, login, verify OTP, session, wallet, and readiness smoke with real HTTP calls.
- [x] Confirm auth/session refresh/logout/logout-all flows return deterministic mobile-safe envelopes under expired, revoked, and missing-device conditions.
- [ ] Confirm KYC and liveness flows expose clear pending, manual-review, approved, rejected, and dependency-unavailable states.

## Ledger And Reconciliation Operations

- [ ] Confirm every money-moving route emits enough ledger identifiers for support to reconcile a user complaint without exposing provider secrets.
- [ ] Confirm reconciliation jobs can be observed through CronHub-compatible status without requiring in-process-only inspection.
- [ ] Confirm failed ledger/provider settlement paths surface actionable support metadata while preserving mobile-safe errors.

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
