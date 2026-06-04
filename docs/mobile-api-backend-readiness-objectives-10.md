# Korido API/Backend Readiness Objectives - Pass 10

Purpose: continue recursive backend/API readiness after pass 9 completed secondary capability and unavailable-mutation metadata. This pass focuses on contract drift where mobile parsers and backend response shapes can diverge even when routes exist.

## Referral Contract Alignment

- [x] Fix `GET /referrals` to return the mobile referral summary object while preserving `/referrals/history` as the history array.
- [x] Add contract/e2e coverage so referral summary fields cannot regress to an array response.

## Secondary Capability Contract Schemas

- [ ] Add formal backend contract schemas for secondary capability metadata.
- [ ] Cover payment links, savings pots, recurring transfers, and referrals capability endpoints in contract tests.

## API Reference Alignment

- [ ] Update backend/mobile API reference docs for secondary capability endpoints and referral summary/history split.
- [ ] Check documented secondary routes against actual backend controller routes and record intentional aliases.

## Recursive Execution Rule

1. Pick the first unchecked item with a concrete backend/API gap.
2. Prove current behavior with unit, contract, e2e, or local HTTP smoke.
3. Patch the API boundary or contract with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Referral Summary Shape - 2026-06-04

Status: complete.

Verified and hardened:

- `GET /referrals` now returns the object shape parsed by mobile `ReferralInfo`: `referralCode`, `referralLink`, `totalReferrals`, `successfulReferrals`, `totalEarned`, `currency`, and `referrals`.
- `GET /referrals/history` remains the raw referral history array.
- E2E asserts `/referrals` is not an array, preventing regression to the previous incompatible alias behavior.
- `totalEarned` is returned as a major-unit number derived from the backend minor-unit reward total.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="referral.controller"`
