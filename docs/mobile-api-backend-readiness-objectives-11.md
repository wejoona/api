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
- [x] Continue parser drift audit for the next active screen/backend route mismatch after alerts.
- [x] Align notification preferences route and payload compatibility for mobile settings.
- [x] Continue parser drift audit for the next active settings/backend route mismatch after notification preferences.
- [x] Add notification device-token legacy route contract coverage.
- [x] Continue parser drift audit for profile/photo and active session routes.
- [x] Add profile avatar upload success-path contract coverage.
- [x] Continue parser drift audit for transaction history list/detail routes.

## Recursive Backend/API Objective Checklist

- [x] Referral summary and referral history contracts.
- [x] Savings pot transaction history endpoint.
- [x] User limits mobile-compatible aliases and usage route.
- [x] Transfer internal route, decimal USDC semantics, and QR send payload.
- [x] Alerts preferences route ordering and mobile read aliases.
- [x] Notification preferences mobile route, response aliases, and grouped-payload compatibility.
- [x] Notification device-token legacy route contract coverage.
- [x] Profile/photo upload and profile data persistence route audit.
- [x] Active sessions 401/error-state audit against session routes.
- [x] Transaction history list/detail field parity with mobile parsers.
- [x] Deposit channel/create/status route parity for CI/US region data.
- [ ] KYC/VerifyHQ OTP and status flow parity under real local stack.
- [ ] Contact discovery/bulk lookup performance and privacy contract audit.
- [ ] Feature subscription/waitlist payload completeness for every "stay informed" surface.
- [ ] Background refresh, push registration, and notification unread-count recovery audit.
- [ ] Backend-mobile verifier must include every active mobile route family before release signoff.

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

### Notification Preferences Mobile Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile settings calls `GET/PUT /notifications/preferences`.
- Backend mounted persisted notification preferences at `GET/PUT /user/notification-preferences`.
- Mobile full-save could send grouped `channels/categories`, which production validation rejected because the DTO only accepted flat fields.

Resolution:

- Preserved the existing `/user/notification-preferences` routes.
- Added `/notifications/preferences` aliases for mobile.
- Added grouped `channels/categories` response aliases while preserving flat canonical fields.
- Added DTO compatibility for grouped mobile payloads.
- Updated mobile full-save serialization to send canonical flat DTO fields.
- Added controller e2e, contract tests, and mobile API contract test coverage.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="notification.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="notification-preferences.controller.e2e-spec"`
- `flutter test test/services/api_contract_alignment_test.dart`
- `npm run verify:backend:mobile`

### Notification Device Token Legacy Route Coverage - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile actively registers/removes push tokens through `/notifications/device-token`.
- Backend supported the route, but the formal notification contract only documented `/notifications/push/token`.
- The legacy route rejected richer mobile metadata such as `appVersion` and `osVersion` even though the newer push-token route accepted them.

Resolution:

- Added `/notifications/device-token` and `/notifications/device-token/:token` to the notification contract endpoint list.
- Aligned the legacy registration DTO with mobile metadata fields accepted by `/notifications/push/token`.
- Added e2e coverage proving both active mobile routes call the expected device token use cases.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="notification.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="notification.controller.e2e-spec"`

### Profile Photo and Session Route Audit - 2026-06-04

Status: complete.

Confirmed state:

- Mobile profile loads `GET /user/profile`, updates `PUT /user/profile`, uploads `POST /user/avatar`, and removes `DELETE /user/avatar`.
- Backend profile contracts already include profile/avatar dependency failure envelopes.
- Mobile sessions consume `GET /sessions`, `DELETE /sessions/:id`, and `DELETE /sessions`; backend already returns `{ sessions, items, total }` and e2e covers 401/403 envelopes.

Resolution:

- Added avatar upload success-path e2e coverage for mobile response fields: `avatarUrl`, `avatarThumb`, and `message`.
- Confirmed active session routes already have mobile-compatible wrappers and auth/error coverage.

Verification:

- `npm run build`
- `npm run test:e2e -- --runInBand --testPathPatterns="user-profile.controller.e2e-spec|session.controller.e2e-spec"`

### Transaction History List/Detail Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Backend transaction contracts expose canonical mobile types such as `internal_transfer_sent`, `internal_transfer_received`, `external_transfer`, `mobile_money_deposit`, and `mobile_money_withdrawal`.
- The live backend query DTO only accepted legacy filters: `deposit`, `withdrawal`, `transfer_internal`, and `transfer_external`.
- Mobile domain and list parsers only recognized the legacy names and could classify positive `internal_transfer_sent` rows as credits.

Resolution:

- Backend now accepts canonical and legacy transaction type filters, including `all`.
- Backend normalizes canonical filter aliases before reaching the storage/use-case layer.
- Backend response direction now handles legacy persisted `transfer_internal` and `transfer_external` types.
- Mobile domain `Transaction` and list `TransactionItem` now preserve backend `direction` and accept canonical type aliases.
- Added backend contract/e2e coverage and mobile parser regression tests.

Verification:

- `flutter test test/services/api_contract_alignment_test.dart`
- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="transaction.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="transaction.controller.e2e-spec"`
- `npm run verify:backend:mobile`

### Deposit Channel/Create/Status Region Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile derives deposit behavior from backend channels, but backend deposit initiation did not verify that the requested channel existed for the source currency/market.
- With mock Yellow Card enabled, a USD/BANK-style deposit could incorrectly return CI Orange Money instructions.
- DTO validation used one XOF-oriented minimum for every currency, so small USD deposits could be rejected before the use case had enough context to return a market-aware result.

Resolution:

- Relaxed DTO validation to currency-neutral numeric bounds.
- Added use-case validation against `GET /wallet/deposit/channels` data before provider initiation.
- Unsupported USD/market/channel combinations now return the existing stable `DEPOSIT_PROVIDER_UNAVAILABLE` envelope with `deposit_channel_unavailable` context.
- Persisted deposit metadata now records the resolved channel id and channel country.
- Added use-case coverage and controller e2e coverage for small USD deposits and unsupported USD channel rejection.

Verification:

- `npm test -- --runInBand --testPathPatterns="initiate-deposit.use-case"`
- `npm run test:e2e -- --runInBand --testPathPatterns="wallet.controller.e2e-spec"`
- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="wallet.contract"`
- `npm run verify:backend:mobile`
