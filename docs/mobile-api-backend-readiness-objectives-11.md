# Korido API/Backend Readiness Objectives - Pass 11

Purpose: continue backend/API readiness after pass 10 aligned secondary feature capabilities and referral route docs. This pass focuses on hard contract coverage for secondary user-facing data shapes that mobile parses directly.

## Referral Summary Contracts

- [x] Add formal backend contract schemas for referral history entries, referral summary, referral stats, and referral code responses.
- [x] Add contract tests proving `GET /referrals` is an object summary and `GET /referrals/history` is an array response.

## Mobile Parser Drift Audit

- [ ] Audit mobile services that cast API responses directly to `Map<String, dynamic>` or `List` and identify backend routes that still need wrapper-tolerant contracts.
- [ ] Patch the first confirmed backend/mobile mismatch with e2e or contract coverage.

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
