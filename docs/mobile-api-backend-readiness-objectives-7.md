# Korido API/Backend Readiness Objectives - Pass 7

Purpose: continue backend/API readiness after provider-state, risk, and mobile contract hardening. This pass focuses on remaining mock/provider modes and operational safety that can affect internal dogfooding and pre-pilot release confidence.

## Identity, Messaging, And Provider Mode Safety

- [x] Confirm KYC/identity verification cannot silently use mock providers in production-like environments.
- [x] Confirm SMS/OTP and push provider mock modes are explicit in readiness metadata and blocked in production-like environments.
- [x] Confirm webhook signature validation cannot be disabled in production-like environments by missing provider secrets.

## Provider Factories And Legacy Mock Fallbacks

- [x] Review deposit and payout provider factories so unavailable real providers return explicit disabled/unavailable states instead of falling back to mock.
- [x] Confirm Circle, Stellar, Yellow Card, and Blnk provider factory modes are visible in readiness/admin metadata.
- [x] Confirm stale mock provider documentation cannot be mistaken for current production behavior.

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

### Webhook Signature Safety - 2026-06-04

Verified and hardened:

- Twilio webhook controller now rejects `TWILIO_VALIDATE_SIGNATURES=false` in production-like environments.
- Twilio webhook controller now requires `TWILIO_AUTH_TOKEN` in production-like environments when signature validation is enabled.
- Production startup validation rejects `TWILIO_VALIDATE_SIGNATURES=false`.
- Production startup validation requires `TWILIO_AUTH_TOKEN` when `SMS_PROVIDER=twilio`.
- Development can still run without Twilio auth token for local callback testing.

Verification:

- `npm test -- --runInBand src/modules/webhook/application/controllers/twilio-webhook.controller.spec.ts src/config/environments/index.spec.ts`

### Deposit And Payout Provider Fallback Safety - 2026-06-04

Verified and hardened:

- `DEPOSIT_USE_MOCK=false` no longer falls back to mock deposit providers.
- `WITHDRAWAL_USE_MOCK=false` no longer falls back to mock payout providers.
- Production-like environments reject `DEPOSIT_USE_MOCK=true` and `WITHDRAWAL_USE_MOCK=true`.
- Live/unimplemented provider requests now return explicit service-unavailable application errors:
  - deposit: `E4001`, `reason=provider_not_implemented`, `featureReason=deposit_provider_not_connected`
  - withdrawal: `E6003`, `reason=provider_not_implemented`, `featureReason=payout_provider_not_connected`
- `/health/mobile-readiness` now exposes `providers.mobileMoneyDeposit` and `providers.mobileMoneyPayout`.
- Deposit provider list entries now include `status`, `available`, `reason`, and `featureReason`.

Verification:

- `npm test -- --runInBand src/modules/deposit/infrastructure/providers/payment-provider.factory.spec.ts src/modules/withdrawal/infrastructure/providers/payout-provider.factory.spec.ts src/config/environments/index.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`

### Provider Mode Readiness Metadata - 2026-06-04

Verified and hardened:

- `/health/mobile-readiness` now exposes sanitized provider mode metadata for:
  - `providers.circle.providerMode`
  - `providers.stellar.providerMode`
  - `providers.yellowCard.providerMode`
  - `app.dependencies.blnk.providerMode`
- Metadata includes mode, production-like state, mock allowance, live configuration state, and mode status.
- Stellar exposes network/backend only, not URLs.
- Blnk exposes only live configuration booleans, not URL, API key, database, or ledger values.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`

### Mock Provider Documentation Alignment - 2026-06-04

Verified and updated:

- Provider module comments now state mock modes are development/test only.
- README production checklist now requires live provider mode or explicit disabled/unavailable states.
- Mobile readiness contract documents provider mode semantics and forbids secrets/raw URLs in mode metadata.
- Provider-disabled mobile contract documents fail-closed behavior for mobile money deposit and payout providers.

Verification:

- `npm run build`
