# Korido API/Backend Readiness Objectives - Pass 7

Purpose: continue backend/API readiness after provider-state, risk, and mobile contract hardening. This pass focuses on remaining mock/provider modes and operational safety that can affect internal dogfooding and pre-pilot release confidence.

## Identity, Messaging, And Provider Mode Safety

- [x] Confirm KYC/identity verification cannot silently use mock providers in production-like environments.
- [x] Confirm SMS/OTP and push provider mock modes are explicit in readiness metadata and blocked in production-like environments.
- [ ] Confirm webhook signature validation cannot be disabled in production-like environments by missing provider secrets.

## Provider Factories And Legacy Mock Fallbacks

- [ ] Review deposit and payout provider factories so unavailable real providers return explicit disabled/unavailable states instead of falling back to mock.
- [ ] Confirm Circle, Stellar, Yellow Card, and Blnk provider factory modes are visible in readiness/admin metadata.
- [ ] Confirm stale mock provider documentation cannot be mistaken for current production behavior.

## Mobile-Facing Operational Contracts

- [ ] Confirm all mobile-facing provider-down responses include stable `reason`, optional `featureReason`, and support-safe retry/review metadata.
- [ ] Confirm health/readiness does not expose raw URLs, API keys, database names, tokens, or provider exception bodies.
- [ ] Confirm contract tests cover the new readiness metadata needed by mobile/dashboard clients.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Prove current behavior with unit, contract, e2e, or local HTTP smoke.
3. Fix the backend/API boundary with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### KYC Provider Mode Safety - 2026-06-04

Verified and hardened:

- KYC provider selection is now centralized in a pure selector.
- Production and staging reject `KYC_PROVIDER=mock`.
- Production and staging reject unsupported KYC providers instead of falling back to mock.
- `KYC_PROVIDER=verifyhq` requires `VERIFY_HQ_API_KEY` in production-like environments.
- Production startup validation rejects missing/mock KYC provider config and missing VerifyHQ API key.
- `/health/mobile-readiness` now exposes KYC provider metadata:
  - `provider`, `productionLike`, `mockAllowed`, `liveConfigured`, and `status`.
- Readiness metadata does not leak `VERIFY_HQ_API_KEY`.

Verification:

- `npm test -- --runInBand src/modules/kyc/kyc.module.spec.ts src/config/environments/index.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`

### Messaging Provider Mode Safety - 2026-06-04

Verified and hardened:

- Production startup validation already rejected `SMS_PROVIDER=mock` and `FCM_USE_MOCK=true`; tests now cover both.
- `SmsFactory` now rejects `mock` in production-like environments at runtime.
- `PushFactory` now rejects FCM mock mode in production-like environments at runtime.
- `/health/mobile-readiness` now exposes messaging provider metadata:
  - SMS: `provider`, `productionLike`, `mockAllowed`, and `status`.
  - Push: `provider`, `productionLike`, `mockAllowed`, `liveConfigured`, and `status`.
- Messaging readiness reports production mock modes as `misconfigured` without exposing provider secrets.

Verification:

- `npm test -- --runInBand src/modules/shared/infrastructure/gateways/sms/sms.factory.spec.ts src/modules/shared/infrastructure/gateways/push/push.factory.spec.ts src/config/environments/index.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`
