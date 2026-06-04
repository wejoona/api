# Korido API/Backend Readiness Objectives - Pass 9

Purpose: continue backend/API readiness after pass 8 completed mobile data truthfulness, market config, and money-movement option contracts. This pass focuses on remaining mobile bootstrap contracts and backend surfaces that can still produce silent fallback or stale UI assumptions.

## Mobile Bootstrap Contracts

- [x] Confirm `/feature-flags/me` and `/feature-flags/check/:key` have explicit contracts matching mobile's flat `Map<String, bool>` parser.
- [x] Confirm feature-flag bootstrap failures return stable mobile-safe envelopes without breaking cached mobile startup.
- [x] Confirm backend/mobile docs describe the same feature-flag response shape.

## User Profile And Identity Surfaces

- [x] Confirm profile/avatar endpoints expose stable mobile fields for name, photo, locale, country, and KYC state.
- [x] Confirm profile/avatar dependency or storage failures return classified retry/review metadata.

## Secondary Feature Capability Surfaces

- [x] Confirm cards, bank linking, bill payments, payment links, savings pots, recurring transfers, and referrals all expose capability/unavailable metadata consistently.
- [x] Confirm mutating endpoints for unavailable secondary features do not produce generic 400/500 messages.

## Recursive Execution Rule

1. Pick the first unchecked item with a concrete backend/API gap.
2. Prove current behavior with unit, contract, e2e, or local HTTP smoke.
3. Patch the API boundary or contract with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Feature Flag Mobile Contract - 2026-06-04

Status: complete.

Verified and hardened:

- Added backend contract schemas for `GET /feature-flags/me` and `GET /feature-flags/check/:key`.
- `/feature-flags/me` is explicitly documented and tested as a flat `{ feature_key: boolean }` map matching mobile's parser.
- Contract tests reject wrapped per-key objects for known mobile keys such as `payment_links`.
- Controller e2e verifies app version/platform query values and user country are forwarded to feature evaluation.
- `npm run verify:backend:mobile` now includes `feature-flag.controller` in the mobile-facing e2e set.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="feature-flag.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="feature-flag.controller"`

### Profile And Avatar Mobile Fields - 2026-06-04

Status: complete.

Verified and hardened:

- `UserSchema` now requires mobile-critical profile fields: `avatarUrl`, `avatarThumb`, `preferredLocale`, `kycRejectionReason`, and `hasPin`.
- Existing name, country, KYC, transaction eligibility, and creation timestamp fields remain required.
- Contract tests validate full, minimal, rejected-KYC, and multi-country profile responses with the complete mobile profile shape.
- `GET /user/profile` e2e asserts runtime output includes name, avatar URL/thumb, locale, country, KYC state, rejection reason, transaction eligibility, and PIN state.
- `verify:backend:mobile` now includes `user-profile.controller`.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="user.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="user-profile.controller"`

### Profile And Avatar Failure Metadata - 2026-06-04

Status: complete.

Verified and hardened:

- Unexpected profile store failures return `503 PROFILE_DEPENDENCY_UNAVAILABLE`.
- Unexpected avatar upload/proxy storage failures return `503 AVATAR_STORAGE_UNAVAILABLE`.
- Validation, conflict, not-found, and other intentional HTTP exceptions are preserved.
- User contracts include mobile-safe retry/review metadata schemas for profile and avatar failures.
- User-profile e2e covers profile dependency failure, avatar upload storage failure, and avatar proxy storage failure.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="user.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="user-profile.controller"`

### Feature Flag Documentation Shape - 2026-06-04

Status: complete.

Verified and hardened:

- Backend feature-flag docs already described `/feature-flags/me` as a flat feature map.
- Mobile feature-flag docs now describe the same flat `{ feature_key: boolean }` response.
- Removed stale wrapped `{ "flags": { ... } }` examples from mobile feature-flag README, implementation, summary, and quick reference docs.

Verification:

- `rg -n '"flags"\\s*:' src/modules/feature-flag /Users/macbook/JoonaPay/USDC-Wallet/mobile/lib/services/feature_flags -g '*.md'`

### Feature Flag Dependency Failure Envelope - 2026-06-04

Status: complete.

Verified and hardened:

- `/feature-flags/me` and `/feature-flags/check/:key` preserve intentional HTTP exceptions.
- Unexpected feature-flag store failures return `503` with `FEATURE_FLAG_DEPENDENCY_UNAVAILABLE`.
- The envelope includes `dependency`, `retryable`, and `supportReviewRequired` fields so mobile can keep cached/default flags without showing a generic startup error.
- Contract and e2e tests assert the failure shape and route metadata.

Verification:

- `npm run build`
- `npm run test:contracts -- --runInBand --testPathPatterns="feature-flag.contract"`
- `npm run test:e2e -- --runInBand --testPathPatterns="feature-flag.controller"`

### Secondary Feature Capability Metadata - 2026-06-04

Status: complete.

Verified and hardened:

- Cards, bank linking, and bill payments already exposed mobile-safe availability metadata and unavailable reasons.
- Added stable `GET /payment-links/capability`, `GET /savings-pots/capability`, `GET /recurring-transfers/capability`, and `GET /referrals/capability` endpoints.
- Added a shared `SecondaryFeatureCapabilityDto` with `feature`, `available`, `status`, `reason`, `featureReason`, `provider`, `retryable`, and `supportReviewRequired`.
- Kept existing list response shapes intact for savings pots and referrals so current mobile parsers do not break.
- Controller e2e verifies capability routes do not fall through into `:id` routes.

Verification:

- `npm run build`
- `npm run test:e2e -- --runInBand --testPathPatterns="payment-link.controller|savings-pot.controller|recurring-transfer.controller|referral.controller|card.controller|bank-linking.controller|bill-payment.controller"`

### Secondary Feature Mutation Failure Metadata - 2026-06-04

Status: complete.

Verified and hardened:

- Card creation already returned a coded unavailable-provider envelope when card issuing is disabled.
- Added e2e coverage for disabled bank-linking mutation paths: link account, verify account, bank deposit, and bank withdrawal.
- Added e2e coverage for disabled/down bill-payment mutation paths: account validation and bill payment.
- Verified unavailable mutation envelopes include stable `reason`, `featureReason`, `provider`, `retryable`, and `supportReviewRequired` metadata instead of generic 400/500 messages.
- Payment links, savings pots, recurring transfers, and referrals are currently API-available surfaces rather than disabled-provider surfaces, so their mutation paths were not assigned artificial unavailable behavior.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="card.controller|bank-linking.controller|bill-payment.controller"`
