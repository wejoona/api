# Korido API/Backend Readiness Objectives - Pass 12

Purpose: continue backend/API readiness after pass 11 closed the mobile verifier coverage baseline. This pass focuses on active mobile route families that still sit outside verified backend capability or need explicit product gating.

## Recursive Backend/API Objective Checklist

- [x] Exchange-rate route parity for mobile `GET /rates/pair?from=USDC&to=XOF`.
- [ ] Legal consent route verifier coverage for mobile onboarding/settings consent calls.
- [ ] Compliance mobile-call audit: separate admin-only endpoints from user-facing mobile-safe endpoints.
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
