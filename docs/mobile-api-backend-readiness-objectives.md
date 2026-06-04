# Korido Mobile API/Backend Readiness Objectives

Purpose: make Korido usable for internal dogfooding with real API-backed flows, clear contracts, and repeatable verification. Work this checklist recursively: finish the highest-risk unchecked item, verify it, commit only defensible changes, then continue.

## Current Verification Baseline

- [x] Backend build passes with `npm run build`.
- [x] Full unit assertions pass with `npm test`.
- [x] Contract tests pass with `npm run test:contracts`.
- [x] Focused mobile-facing e2e assertions pass for auth, contact, device, session, wallet, transaction, notification, and feature subscription routes.
- [x] Focused mobile-facing e2e runner exits cleanly without `--forceExit`.
- [x] Full unit runner exits without worker force-exit warnings.

## API Contract Objectives

- [x] Feature subscription endpoint records the specific feature and source screen, not only a generic newsletter flag.
- [x] Feature subscription list endpoint normalizes pagination boundaries.
- [x] Contact sync test covers hashed lookup instead of raw full phone book matching.
- [x] Contact sync excludes the requesting user from Korido matches.
- [ ] Verify mobile request/response mappings against live API for auth, wallet, transactions, contacts, devices, sessions, notifications, and feature subscriptions.
- [ ] Add missing contract tests where mobile currently depends on undocumented response fields.
- [ ] Ensure every mobile-facing error returns a stable user-actionable code/message pair.

## Auth, Sessions, And Devices

- [ ] Verify login OTP flow through Korido API and VerifyHQ-compatible local path using default test OTP where configured.
- [ ] Confirm refresh-token, logout, logout-all, and active-session endpoints return mobile-consumable 401/403 states without noisy stack traces.
- [ ] Verify device registration/update/revocation behavior is idempotent and audit-safe.
- [ ] Confirm active-session screen never shows raw 401 text; backend must provide consistent auth failure semantics.

## Wallet And Transaction Flows

- [ ] Verify balance endpoint, transaction history, transaction detail, deposit, transfer, and success payloads against real database state.
- [ ] Replace any mobile fake transaction/balance fields with API-backed fields or explicit unavailable states.
- [ ] Ensure money fields are returned as decimal-safe strings or minor units consistently.
- [ ] Add e2e coverage for empty wallet, funded wallet, pending transfer, failed transfer, and completed transfer states.

## Notifications

- [ ] Verify notification feed, unread count, mark-read, mark-all-read, and preference endpoints.
- [ ] Ensure backend notification color/type/severity maps are stable enough for mobile UI styling.
- [ ] Confirm push setup fallback does not block in-app notification usage.

## Contacts And Discovery

- [x] Backend contact matching uses phone hashes.
- [x] Backend excludes self from contact matches.
- [ ] Verify individual and bulk lookup latency and indexing strategy for scale.
- [ ] Confirm backend never stores or returns raw uploaded phone book data unless explicitly required by policy.
- [ ] Add coverage for empty permission, denied permission, no matches, partial matches, and large contact batches.

## Reliability And Test Hygiene

- [x] Direct Redis clients now suppress retry loops during test shutdown.
- [x] Direct Redis clients attempt bounded graceful shutdown and fallback disconnect.
- [x] Deposit webhook replay-protection interval is unref'd and cleared on module destroy.
- [x] E2E helper Redis clients close with bounded graceful shutdown.
- [x] Circuit breaker timeout races clear timers and tests do not leak long-running timers.
- [ ] Replace repeated direct Redis shutdown code with a shared Redis client factory or shutdown helper.
- [ ] Add a CI-safe backend verification command that does not require `--forceExit`.

## Recursive Execution Rule

1. Pick the first unchecked item that can be verified locally.
2. Reproduce with a focused test or API call.
3. Fix the correct boundary: mobile request, API DTO/controller/service, or dependency mock.
4. Add or update tests covering the contract.
5. Run build, focused tests, and relevant contract/e2e tests.
6. Commit only when the change is scoped and the remaining risks are explicit.
