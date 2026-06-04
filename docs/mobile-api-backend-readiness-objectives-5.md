# Korido API/Backend Readiness Objectives - Pass 5

Purpose: continue backend readiness after schema/bootstrap hardening, with focus on live API behavior, background processing, and mobile-safe operational states.

## Live API Dogfood Smoke

- [x] Run a real local HTTP smoke through VerifyHQ dev OTP: register, login, verify OTP, register device, sessions, wallet, balance, contacts lookup, notifications, feature subscription.
- [x] Confirm local API startup no longer emits `batch_jobs.user_id` or mobile-critical schema errors after the drift repair.
- [x] Confirm health/readiness exposes dependency status in a mobile/operator-safe format.

## Background And Job Boundaries

- [x] Confirm scheduled reconciliation and batch-processing queries run against the repaired schema without runtime column errors.
- [x] Confirm job failure states produce admin/support-visible metadata without leaking provider secrets.
- [x] Confirm CronHub status can represent registered, late, missed, failed, and recovered jobs from persisted history.

## Provider And Dependency Degradation

- [x] Confirm VerifyHQ unavailable, NTM unavailable, Blnk unavailable, Circle mock, Yellow Card mock, and Redis unavailable paths return deterministic mobile-safe errors or degraded states.
- [x] Confirm user-facing money routes never claim success/refund when provider/ledger rollback is uncertain.
- [x] Confirm feature waitlist/newsletter and notifications degrade locally without blocking core wallet flows.

## Audit, Security, And Compliance Backend

- [ ] Confirm auth/device/session mutations write audit events with correlation ids and sanitized metadata.
- [ ] Confirm contact discovery uses hashed/normalized phone lookup and does not expose unrelated users' full phone book data.
- [ ] Confirm risk/compliance checks are either wired to the current risk service or fail closed with clear support state.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Prove current behavior with real HTTP smoke, unit, contract, e2e, or DB check.
3. Fix the backend/API boundary with the smallest durable change.
4. Run focused verification plus the relevant broader verifier.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Live API Dogfood Smoke - 2026-06-04

Verified against local services:

- Korido API on `127.0.0.1:3401` and VerifyHQ on `127.0.0.1:3300` were already running and healthy.
- Fresh phone registration, login, VerifyHQ dev OTP `123456`, device registration, session listing, wallet creation, and balance retrieval all succeeded over real HTTP.
- Contact discovery contract verified:
  - `POST /contacts/check` is the privacy-preserving phone-book endpoint. It accepted `phoneNumbers` for the deprecated compatibility path, hashed them server-side, and returned only matched Korido users with `phoneHash` and `maskedPhone`.
  - `GET /contacts/lookup?query=...` is text search for registered Korido users and returns masked phones only.
- `GET /notifications` returned a stable empty feed envelope.
- `POST /feature-subscriptions` successfully recorded a `vcard` waitlist subscription with feature context metadata.

Startup/readiness verification:

- `npm run start:prod` was stale and pointed to `dist/main`; Docker already used `dist/src/main.js`. Updated the npm script to `node -r tsconfig-paths/register dist/src/main.js`.
- Started a fresh API instance on port `3402` from the rebuilt dist with local dev-only secrets and `BLNK_URL=http://127.0.0.1:5002`.
- Startup logs showed batch processing queries now select `user_id`, `organization_id`, `scheduled_at`, `updated_at`, and `created_at` without the old column error.
- `GET /api/v1/health` returned `ok`.
- `GET /api/v1/health/mobile-readiness` returned `ready`, with database, Redis, and Blnk up, Yellow Card skipped/disabled, and feature availability exposed explicitly.

Verification:

- `npm run build`
- Live HTTP smoke against `127.0.0.1:3401`
- Fresh dist startup/readiness smoke against `127.0.0.1:3402`

### Background And Job Boundaries - 2026-06-04

Verified and hardened:

- Fresh startup logs showed batch-processing scheduled queries using the repaired snake_case schema: `user_id`, `organization_id`, `scheduled_at`, `updated_at`, and `created_at`.
- CronHub-compatible `status` remains backward-compatible with `new`, `healthy`, `running`, `late`, and `missed`.
- Added explicit operational metadata for support/admin dashboards:
  - `healthState`: `new`, `healthy`, `running`, `late`, `missed`, `failed`, or `recovered`.
  - `previousLastStatus`: previous run state when available.
  - `recoveredAt`: timestamp of a successful run that directly follows a failed run.
- Failed jobs now stay CronHub-compatible as `status=missed` while exposing `healthState=failed` and the persisted `errorMessage`.
- Recovered jobs now report `status=healthy`, `healthState=recovered`, `previousLastStatus=failure`, and `recoveredAt`.

Verification:

- `npm test -- --runInBand src/modules/jobs/services/scheduled-jobs.service.spec.ts`
- `npm run test:e2e -- --runInBand --testPathPatterns="jobs.controller"`
- `npm run build`

### Provider And Dependency Degradation - 2026-06-04

Verified and hardened:

- `GET /health/mobile-readiness` now returns deterministic public dependency errors:
  - Down dependencies expose `error=dependency_unavailable` and `errorType`.
  - Raw provider/database exception messages are not returned to mobile, avoiding leaked URLs, database names, API keys, or secrets.
- Core dependency failure returns `status=not_ready` while still exposing feature availability, so mobile can display a stable maintenance/degraded state.
- Provider-only failure returns `status=degraded` while `app.ready=true`, so mobile can keep core wallet flows available and gate unavailable provider features.
- VerifyHQ unavailable paths are wrapped as `KYC_PROVIDER_UNAVAILABLE` or `DEPENDENCY_UNAVAILABLE` state.
- NTM/push failures are non-blocking: in-app notifications are persisted and push delivery failure is recorded without crashing the main flow.
- Feature waitlist/newsletter subscriptions persist feature/source/regional metadata and remain isolated from wallet core flows.
- Money-route behavior is covered:
  - External transfers void inflight ledger records on provider failure.
  - If voiding fails, the API returns review metadata and does not claim the funds were refunded.
  - Internal P2P transfer failure at Blnk ledger recording returns a failed support state before local transaction writes.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="health.controller"`
- `npm test -- --runInBand src/modules/wallet/application/usecases/external-transfer.use-case.spec.ts src/modules/wallet/application/usecases/internal-transfer.use-case.spec.ts src/modules/notification/application/domain/services/notification-fallback.spec.ts src/modules/feature-subscriptions/application/services/feature-subscription.service.spec.ts`
