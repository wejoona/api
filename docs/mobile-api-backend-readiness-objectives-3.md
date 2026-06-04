# Korido API/Backend Readiness Objectives - Pass 3

Purpose: harden the API beyond route existence and happy-path contracts. Focus on mobile-visible backend behavior that must be stable before internal dogfooding scales into pilot usage.

## Error Semantics And Domain Codes

- [x] Replace generic mobile-facing money-movement exceptions with `AppException` codes where clients need deterministic handling.
- [x] Add endpoint-level negative-path e2e coverage for representative unavailable, forbidden ownership, insufficient funds, invalid PIN, and missing wallet envelopes.
- [x] Confirm validation errors expose field-level details without leaking secrets or provider internals.

## Financial Operation Integrity

- [ ] Confirm all money-moving flows have a single source-of-truth balance check and clear fallback semantics.
- [ ] Confirm ledger reservation, commit, void, and provider failure paths are covered by focused unit tests.
- [ ] Confirm recurring and scheduled transfer execution paths use the same PIN/risk/compliance decisions captured at setup time or explicitly re-evaluate before execution.

## Operational Safety

- [ ] Confirm mobile-facing endpoints emit enough structured events for audit, reconciliation, and support without logging PINs, OTPs, tokens, or full wallet addresses.
- [ ] Confirm provider-disabled modes are consistent across cards, banks, deposits, bill pay, and external withdrawals.
- [ ] Confirm API health/readiness reports distinguish app readiness, provider readiness, and feature availability.

## Recursive Execution Rule

1. Pick the first unchecked item.
2. Reproduce with a focused test or endpoint inspection.
3. Fix the API/controller/service/contract boundary.
4. Add unit, contract, or e2e coverage that would fail before the fix.
5. Run focused tests, build, and `npm run verify:backend:mobile` if the change affects mobile-facing routes.
6. Commit and push to GitLab/GitHub before moving to the next item.
