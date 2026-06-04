# Korido API/Backend Readiness Objectives - Pass 2

Purpose: continue mobile dogfooding readiness after the first checklist is complete. Focus on API/backend contract gaps that can surface as fake data, 404s, 401 noise, or region-inaccurate screens.

## Mobile-Facing Contract Gaps

- [x] Add a mobile-compatible `GET /referrals` alias or update the contract so referral list screens do not call a missing route.
- [x] Add contract/e2e coverage for `/config/countries` so Abidjan/USA region behavior is data-driven and stable.
- [x] Resolve merchant mobile endpoint drift: mobile uses `/merchant/*`, backend exposes `/merchants/*`.
- [x] Verify payment-link mobile paths against backend for list, create, pay-by-code, get-by-id, and cancel.
- [x] Verify savings pots and cards return mobile-safe empty/disabled states when providers are unavailable.
- [x] Verify bank-linking endpoints return region-aware unavailable states for USA/CI if no live provider is enabled.
- [x] Verify beneficiaries, bulk payments, and recurring transfers either work with real data or return explicit unavailable states.

## Backend Reliability And Compliance

- [x] Confirm risk/compliance checks are reachable from money-moving flows without blocking local dogfooding when external dependencies are mocked.
- [x] Confirm all mobile-facing money-moving endpoints use idempotency/PIN guards consistently where needed.
- [ ] Confirm API error envelopes are stable for unavailable feature, forbidden ownership, insufficient funds, invalid PIN, and missing wallet states.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Reproduce with a focused test or endpoint inspection.
3. Fix the API/controller/service/contract boundary.
4. Add contract/e2e coverage.
5. Run focused tests, build, and `npm run verify:backend:mobile` if the change affects mobile-facing routes.
6. Commit and push to GitLab/GitHub before moving to the next item.
