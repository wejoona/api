# Korido API/Backend Readiness Objectives - Pass 14

Purpose: extend recursive backend/API readiness from core dogfood routes to visible secondary mobile capability routes.

## Recursive Backend/API Objective Checklist

- [x] Smoke safe secondary routes with a fresh authenticated local user.
- [x] Classify smoke failures against actual mobile callers before patching.
- [x] Ignore inactive mismatch: `GET /risk/session` because mobile uses `POST /risk/session`.
- [x] Ignore inactive query shape: `/wallet/exchange-rate?from=XOF&to=USD` because mobile uses `sourceCurrency/targetCurrency/amount`.
- [x] Fix active referral dashboard failure for fresh users.
- [x] Fix Bill Pay history adapter pagination/query mapping.
- [x] Expand reusable `npm run smoke:mobile:api` to cover secondary mobile-safe routes.
- [x] Add focused backend regression tests for the fixed paths.

## Execution Notes

### Secondary Live Smoke - 2026-06-04

Initial failures:

- `GET /wallet/exchange-rate?from=XOF&to=USD` returned 400.
- `GET /bill-payments/history` and `GET /bill-payments/history?page=1&limit=20` returned 400.
- `GET /referrals` returned 500.
- `GET /risk/session` returned 404.

Classification:

- Mobile calls wallet exchange rate with `sourceCurrency`, `targetCurrency`, `amount`, and `direction`, so the `from/to` query shape is not active.
- Mobile calls risk session with `POST /risk/session`, so `GET /risk/session` is not active.
- Mobile referrals screen calls `GET /referrals`; this is active and must work for fresh users.
- Mobile bill history calls `GET /bill-payments/history?page=...&limit=...`; this is active.

### Referral Fresh-User Fix

Status: complete.

Root cause:

- Fresh referral dashboard generation writes bigint money fields.
- Local TypeORM debug logging serializes query metadata with `JSON.stringify`, which fails on raw `bigint` values.

Resolution:

- Normalized referral stats and referral reward bigint fields to decimal strings at the repository boundary before TypeORM save/update.
- Added fresh-user `GET /referrals` e2e coverage.

### Bill Pay History Adapter Fix

Status: complete.

Root cause:

- Korido forwarded mobile `page`, `limit`, and `userId` query params to Bill Pay.
- Bill Pay owns strict query validation and expects `limit` plus `offset`; user scope is provided by auth/client context, not `userId` query.

Resolution:

- Korido now translates `page/limit` to `offset/limit`.
- `startDate/endDate` map to Bill Pay `fromDate/toDate`.
- `userId` is sent only through the existing `X-User-Id` header.
- Added a focused adapter unit test for the mapping.

### Reusable Smoke Coverage

Status: complete.

`npm run smoke:mobile:api` now covers core and secondary safe routes:

- Auth, profile, wallet bootstrap, transactions, notifications, contacts, sessions/devices, limits, export, flags/subscriptions.
- Deposit channels/providers, exchange rates, external fee estimate.
- Cards, banks, bank accounts.
- Bill payment providers/categories/history.
- Payment links, savings pots, recurring transfers.
- Referrals capability, summary, and history.
- Risk profile and whitelisted addresses.
