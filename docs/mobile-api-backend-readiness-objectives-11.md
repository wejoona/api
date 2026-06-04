# Korido API/Backend Readiness Objectives - Pass 11

Purpose: continue backend/API readiness after pass 10 aligned secondary feature capabilities and referral route docs. This pass focuses on hard contract coverage for secondary user-facing data shapes that mobile parses directly.

## Referral Summary Contracts

- [x] Add formal backend contract schemas for referral history entries, referral summary, referral stats, and referral code responses.
- [x] Add contract tests proving `GET /referrals` is an object summary and `GET /referrals/history` is an array response.

## Mobile Parser Drift Audit

- [x] Audit mobile services that cast API responses directly to `Map<String, dynamic>` or `List` and identify backend routes that still need wrapper-tolerant contracts.
- [x] Patch the first confirmed backend/mobile mismatch with e2e or contract coverage.
- [x] Continue parser drift audit for the next active screen/backend route mismatch.
- [x] Continue parser drift audit for the next active screen/backend route mismatch after user limits.
- [x] Align transfer route contract and decimal amount semantics for mobile send/QR.
- [x] Continue parser drift audit for the next active screen/backend route mismatch after transfers.
- [x] Align alerts route ordering and mobile mark-read methods.
- [ ] Continue parser drift audit for the next active screen/backend route mismatch after alerts.

## Recursive Execution Rule

1. Pick the first unchecked item with a concrete backend/API gap.
2. Prove current behavior with unit, contract, e2e, or local HTTP smoke.
3. Patch the API boundary or contract with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Referral Summary Contracts - 2026-06-04

Status: complete.

Verified and hardened:

- Added formal contract schemas for referral entries, mobile referral summary, history items, referral code, and referral stats.
- Contract tests verify `GET /referrals` remains an object summary and rejects a raw array.
- Contract tests verify history, code, and stats response examples.
- Registered the referral contract group in the central contract schema index.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="referral.contract"`

### Savings Pot Transaction History Contract - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile calls `GET /savings-pots/:id/transactions` for pot child-screen history.
- Backend exposed savings pot CRUD/deposit/withdraw routes but not the history route, so mobile swallowed a 404 into an empty list.

Resolution:

- Added explicit `GET /savings-pots/:id/transactions`.
- The route validates pot ownership through `GetSavingsPotsUseCase.executeOne`.
- The route returns `{ transactions: [], items: [], total: 0 }` until ledger-backed savings history is projected.
- Added savings pot transaction contract schemas and tests.
- Added controller e2e coverage to prevent route regression.

Verification:

- `npm run test:contracts -- --runInBand --testPathPatterns="savings-pot.contract|referral.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="savings-pot.controller.e2e-spec"`
- `npm run verify:backend:mobile`

### User Limits Mobile Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile calls `GET /user/limits` and parses flat fields such as `dailyLimit`, `monthlyLimit`, `singleTransactionLimit`, `dailyUsed`, and `kycTier`.
- Backend returned only the canonical nested shape: `tier`, `kycStatus`, `daily`, `monthly`, and `perTransaction`.
- Mobile also calls `GET /user/limits/usage`, but backend did not expose that route.

Resolution:

- Kept the canonical nested backend limits response.
- Added flat mobile aliases to `GET /user/limits`.
- Added `GET /user/limits/usage`, derived from the same computed limits source.
- Updated user limits contracts to match the actual server response plus mobile aliases.
- Added e2e coverage for both limits routes.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="user.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="user-profile.controller.e2e-spec"`
- `npm run verify:backend:mobile`

### Transfer Route Mobile Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile send and QR P2P call `POST /transfers/internal` with `recipientPhone`.
- Backend contract coverage primarily documented the legacy `/wallet/transfer/internal` route with `toPhone`.
- Transfer DTO and Swagger examples said cents, while the internal transfer use case validates decimal USDC major units and converts to micro-units for Blnk.
- QR P2P was sending cents to `/transfers/internal`, unlike normal send.
- Transfer controller returned `note` but did not pass it into the use case for persistence.

Resolution:

- Added dedicated `/transfers/internal` contracts using `recipientPhone` and decimal USDC amount.
- Updated transfer DTO/response Swagger docs and validation minimum to decimal USDC semantics.
- Passed `note` into `InternalTransferUseCase`.
- Added e2e coverage for decimal transfer amount and note propagation.
- Added `transfer.controller` to `npm run verify:backend:mobile`.
- Updated mobile QR P2P to send decimal USDC amount to `/transfers/internal`.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="transfer.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="transfer.controller.e2e-spec"`
- `flutter test test/features/qr_payment/qr_code_service_test.dart test/e2e/transfers_e2e_test.dart`
- `npm run verify:backend:mobile`

### Alerts Mobile Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile loads `/alerts/preferences`, but backend registered `/alerts/:id` before the preferences route.
- Mobile marks alerts read with `PUT /alerts/:id/read` and `PUT /alerts/read-all`, while backend only exposed POST variants.
- Monitoring e2e was not part of the backend-mobile verifier.

Resolution:

- Moved `GET /alerts/:id` after concrete preference routes.
- Added PUT aliases for mark-one-read and mark-all-read while preserving existing POST routes.
- Added e2e coverage for preferences route ordering, alert-types, and mobile PUT mark-read calls.
- Added `monitoring.controller` to `npm run verify:backend:mobile`.

Verification:

- `npm run build`
- `npm run test:e2e -- --runInBand --testPathPatterns="monitoring.controller.e2e-spec"`
- `npm run verify:backend:mobile`
