# Korido API/Backend Readiness Objectives - Pass 12

Purpose: continue backend/API readiness after pass 11 closed the mobile verifier coverage baseline. This pass focuses on active mobile route families that still sit outside verified backend capability or need explicit product gating.

## Recursive Backend/API Objective Checklist

- [x] Exchange-rate route parity for mobile `GET /rates/pair?from=USDC&to=XOF`.
- [x] Legal consent route verifier coverage for mobile onboarding/settings consent calls.
- [x] Compliance mobile-call audit: separate admin-only endpoints from user-facing mobile-safe endpoints.
- [ ] Audit/log ingestion route decision for mobile background services.
- [ ] AML/fraud mobile service audit: integrate real risk/compliance capability or gate unavailable screens/services.
- [ ] Privacy/account export route parity or alias decision.
- [ ] Expenses/insights route parity or remove from active mobile dependency graph.

## Recursive Execution Rule

1. Pick the first unchecked backend/API route family that mobile can call.
2. Prove current behavior with unit, controller e2e, contract, or local HTTP smoke.
3. Patch the backend boundary, mobile call, or product gate with the smallest durable change.
4. Run focused verification plus `npm run verify:backend:mobile`.
5. Commit and push to GitLab/GitHub before moving to the next item.

## Execution Notes

### Exchange Rate Mobile Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile calls `GET /rates/pair?from=USDC&to=XOF`.
- Backend exchange-rate cache stores `USD/XOF`, and `getRate()` did not normalize the USDC stablecoin peg for pair reads.
- The route could return `400 No rate available for USDC/XOF`, causing mobile to silently fall back to a local `600` rate.
- `verify:backend:mobile` did not include exchange-rate controller coverage.

Resolution:

- Updated `ExchangeRateService.getRate()` to normalize USDC as USD while preserving the requested response currencies.
- Added stable `USD/USDC` peg behavior.
- Added unit coverage for `USDC/XOF`, `XOF/USDC`, and `USD/USDC`.
- Added controller e2e coverage for the active mobile pair route and convert validation.
- Added `exchange-rate.controller` to `verify:backend:mobile`.

Verification:

- `npm test -- --runInBand --testPathPatterns="exchange-rate.service.spec"`
- `npm run test:e2e -- --runInBand --testPathPatterns="exchange-rate.controller"`

### Legal Document and Consent Compatibility - 2026-06-04

Status: complete.

Confirmed gap:

- Mobile fetches `/legal/terms`, `/legal/privacy`, `/legal/cookies`, and posts `/legal/consent`.
- Backend routes existed and the DTO matched mobile snake_case consent payloads, but the family was not included in `verify:backend:mobile`.

Resolution:

- Added legal controller e2e coverage for all active mobile document routes.
- Added consent success and validation failure coverage for the exact mobile payload shape.
- Added `legal.controller` to `verify:backend:mobile`.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="legal.controller"`

### Compliance Mobile Boundary Audit - 2026-06-04

Status: complete.

Confirmed state:

- Customer-facing transaction limits use `/user/limits` and `/user/limits/usage`; these are already covered by `user-profile.controller` e2e and mobile API alignment tests.
- Backend `/compliance/*` routes are admin/compliance-officer surfaces guarded by `JwtAuthGuard`, `RolesGuard`, and compliance roles.
- Mobile contains exported compliance utility services, but normal customer features, providers, and router code do not call `/compliance/*`.

Resolution:

- Kept admin/compliance routes separate instead of exposing them to customer mobile flows.
- Added a mobile architecture test proving customer UI/navigation/provider code does not call `/compliance/*`.
- Added a guardrail proving customer transaction limits remain sourced from `/user/limits` and `/user/limits/usage`, not `/compliance/limits`.

Verification:

- `flutter test test/services/compliance/customer_compliance_boundary_test.dart`
