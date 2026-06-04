# Korido Mobile API/Backend Readiness Objectives

Purpose: make Korido usable for internal dogfooding with real API-backed flows, clear contracts, and repeatable verification. Work this checklist recursively: finish the highest-risk unchecked item, verify it, commit only defensible changes, then continue.

## Current Verification Baseline

- [x] Backend build passes with `npm run build`.
- [x] Full unit assertions pass with `npm test`.
- [x] Contract tests pass with `npm run test:contracts`.
- [x] Focused mobile-facing e2e assertions pass for auth, contact, device, session, wallet, transaction, notification, and feature subscription routes.
- [x] Focused mobile-facing e2e runner exits cleanly without `--forceExit`.
- [x] Full unit runner exits without worker force-exit warnings.
- [x] Fresh local database migrations apply cleanly against isolated Postgres.
- [x] Local API boots against isolated Postgres/Redis with mock external providers.

## API Contract Objectives

- [x] Feature subscription endpoint records the specific feature and source screen, not only a generic newsletter flag.
- [x] Feature subscription list endpoint normalizes pagination boundaries.
- [x] Contact sync test covers hashed lookup instead of raw full phone book matching.
- [x] Contact sync excludes the requesting user from Korido matches.
- [x] Notification unread count supports the mobile-compatible `/notifications/unread-count` alias.
- [x] Device list/register responses include mobile-used `userId` and `appVersion` fields.
- [x] Session and device controller e2e tests assert response shape and request bodies, not only HTTP status.
- [x] Live API smoke verified auth, wallet, transactions, contacts, devices, sessions, notifications, and feature subscriptions return mobile-consumable responses.
- [x] Disabled deposit provider discovery returns mobile-safe empty `channels`/`providers` responses instead of 500.
- [x] Add missing contract tests where mobile currently depends on undocumented response fields for notifications, devices, and sessions.
- [x] Ensure every mobile-facing error returns a stable user-actionable code/message pair for validation, auth, and session ownership failures.

## Auth, Sessions, And Devices

- [x] Verify login/register OTP flow through Korido API local verification path using default test OTP `123456`.
- [x] Session list endpoint returns mobile-parsable active session fields.
- [x] Session revoke and revoke-all endpoints accept/pass mobile reason payloads.
- [x] Device list endpoint returns mobile-parsable device fields used by the settings screen.
- [x] Device register endpoint returns app version after registration/update.
- [x] Auth login, refresh, logout, and logout-all e2e tests assert mobile-consumable success/action payloads.
- [x] Device list endpoints return `200 []` for users with no registered devices.
- [x] Confirm refresh-token, logout, logout-all, and active-session endpoints return mobile-consumable 401/403 states without noisy stack traces.
- [x] Verify device registration/update/revocation behavior is idempotent and audit-safe.
- [x] Confirm active-session screen never shows raw 401 text; backend now emits a normalized auth failure envelope.

## Wallet And Transaction Flows

- [x] Verify wallet creation, balance endpoint, and empty transaction history against real local database state.
- [x] Verify disabled deposit provider state against real local API.
- [x] Add controller-level mobile payload assertions for transaction detail, deposit initiation/status, internal transfer, external transfer, withdraw, and success/receipt fields.
- [x] Fix transaction deposit-status route ordering so `/wallet/transactions/deposit/:id/status` is not swallowed by the generic transaction detail route.
- [x] Verify transaction detail, deposit initiation, transfer, and success payloads against real database state.
- [ ] Replace any mobile fake transaction/balance fields with API-backed fields or explicit unavailable states.
- [x] Ensure money fields are returned with additive decimal-safe string companions on mobile-facing wallet and transaction endpoints.
- [x] Add e2e coverage for empty wallet, funded wallet, pending transfer, failed transfer, and completed transfer states.

## Notifications

- [x] Verify notification feed, unread count, and preferences endpoints against live local API.
- [x] Verify mark-read and mark-all-read endpoints against live local API.
- [x] Ensure backend notification color/type/severity maps are stable enough for mobile UI styling.
- [ ] Confirm push setup fallback does not block in-app notification usage.

## Contacts And Discovery

- [x] Backend contact matching uses phone hashes.
- [x] Backend excludes self from contact matches.
- [x] Verify contact list and lookup endpoints against live local API.
- [ ] Verify individual and bulk lookup latency and indexing strategy for scale.
- [ ] Confirm backend never stores or returns raw uploaded phone book data unless explicitly required by policy.
- [ ] Add coverage for empty permission, denied permission, no matches, partial matches, and large contact batches.

## Reliability And Test Hygiene

- [x] Direct Redis clients now suppress retry loops during test shutdown.
- [x] Direct Redis clients attempt bounded graceful shutdown and fallback disconnect.
- [x] Deposit webhook replay-protection interval is unref'd and cleared on module destroy.
- [x] E2E helper Redis clients close with bounded graceful shutdown.
- [x] Circuit breaker timeout races clear timers and tests do not leak long-running timers.
- [x] Batch job scheduler ORM mapping matches migration columns and no longer emits camelCase-column query errors.
- [x] Device crypto fields are covered by a real database migration instead of an unregistered module-local migration.
- [x] Replace repeated direct Redis shutdown code with a shared Redis client factory or shutdown helper.
- [x] Add a CI-safe backend verification command that does not require `--forceExit`.

## Recursive Execution Rule

1. Pick the first unchecked item that can be verified locally.
2. Reproduce with a focused test or API call.
3. Fix the correct boundary: mobile request, API DTO/controller/service, or dependency mock.
4. Add or update tests covering the contract.
5. Run build, focused tests, and relevant contract/e2e tests.
6. Commit only when the change is scoped and the remaining risks are explicit.
