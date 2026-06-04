# Korido API/Backend Readiness Objectives - Pass 12

Purpose: continue backend/API readiness after pass 11 closed the mobile verifier coverage baseline. This pass focuses on active mobile route families that still sit outside verified backend capability or need explicit product gating.

## Recursive Backend/API Objective Checklist

- [x] Exchange-rate route parity for mobile `GET /rates/pair?from=USDC&to=XOF`.
- [x] Legal consent route verifier coverage for mobile onboarding/settings consent calls.
- [x] Compliance mobile-call audit: separate admin-only endpoints from user-facing mobile-safe endpoints.
- [x] Audit/log ingestion route decision for mobile background services.
- [x] AML/fraud mobile service audit: integrate real risk/compliance capability or gate unavailable screens/services.
- [x] Privacy/account export route parity or alias decision.
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

### Audit/Log Ingestion Boundary Audit - 2026-06-04

Status: complete.

Confirmed state:

- Mobile has dormant audit utility services with hardcoded `/audit/*` routes for login attempts, security batches, user action batches, and compliance event batches.
- Those utility providers are not wired into normal customer features, providers, or router code.
- Backend audit retrieval is currently admin-owned under `/admin/audit-logs`; there is no mobile-safe `/audit/*` ingestion controller.
- Server-side wallet, auth, admin, compliance, and transaction operations remain the authoritative audit source for regulated actions.

Decision:

- Do not expose public customer mobile `/audit/*` ingestion in this pass.
- Keep mobile audit ingestion dormant until the backend owns a formal ingestion contract covering authentication, rate limits, idempotency, event schema, PII filtering, retention, replay protection, and abuse handling.
- Added a mobile architecture test preventing customer UI/navigation/provider code from depending on the inactive `/audit/*` routes.

Verification:

- `flutter test test/services/audit/customer_audit_ingestion_boundary_test.dart`

### AML/Fraud Mobile Boundary Audit - 2026-06-04

Status: complete.

Confirmed state:

- Active send and withdrawal flows use backend-owned `/step-up/transaction`, with fallback to local verification if risk evaluation is unavailable.
- Active mobile session/profile risk routes are `/risk/session` and `/risk/profile`, already covered by `risk.controller` e2e.
- Whitelisted external address management uses `/security/addresses/*`, already covered by `whitelisted-address.controller` e2e.
- Mobile contains dormant AML/fraud utility services with `/aml/*` and `/fraud/*` route strings that do not exist as customer-safe backend controllers.
- Mobile also contains an address pre-screen helper for `/risk/screen-address`; backend performs address screening server-side through transaction/risk services, but no mobile-safe public route exists for that helper.

Decision:

- Keep active customer flows on `/step-up/*`, `/risk/session`, `/risk/profile`, and `/security/addresses/*`.
- Do not expose `/aml/*`, `/fraud/*`, or `/risk/screen-address` to customer mobile in this pass.
- Final AML, sanctions, and address-screening enforcement stays backend-side during money movement.
- Added a mobile architecture test preventing dormant AML/fraud/address-screening helpers from being wired into customer UI/provider code.

Verification:

- `flutter test test/services/risk/customer_aml_fraud_boundary_test.dart`

### Privacy and Account Export Route Parity - 2026-06-04

Status: complete.

Confirmed gap:

- Visible mobile export screen called `POST /account/export`.
- Backend verified route is `GET /user/data-export`, returning immediate user profile export data.
- Mobile also contains dormant privacy request services for `/privacy/export/*`, `/privacy/deletion/*`, and retention routes, but those backend controllers are not part of the mobile-safe API surface.

Resolution:

- Updated the visible export screen to call `GET /user/data-export`.
- Kept richer async privacy export/deletion request APIs gated until backend owns a formal request lifecycle, retention policy integration, and notification delivery path.
- Added a mobile architecture test preventing visible customer UI from depending on `/account/export` or dormant `/privacy/export/*` routes.

Verification:

- `flutter test test/services/privacy/customer_export_route_boundary_test.dart`
