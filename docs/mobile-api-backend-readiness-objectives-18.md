# Mobile API Backend Readiness Objectives - Pass 18

Date: 2026-06-04

## Objective

Make the backend smoke path country-aware for the two internal dogfood markets:
Cote d'Ivoire and the United States.

## Completed

- Fixed `/config/countries` so deployment-style country code lists such as
  `CI,SN,ML,BF,BJ,TG,NE,US` resolve to full country objects instead of malformed
  string spread objects.
- Preserved support for full object country overrides.
- Added a US mock on-ramp channel for local dogfood:
  - `usdc_crypto_us`
  - country `US`
  - currency `USD`
  - type `crypto`
- Extended the shared payment gateway contract to include `crypto` on-ramp
  channels and payment instructions.
- Made `scripts/smoke-mobile-api.js` country-aware:
  - validates selected country exists and has open onboarding
  - uses CI phone/contact/rate/deposit expectations for `COUNTRY_CODE=CI`
  - uses US phone/contact/rate/deposit expectations for `COUNTRY_CODE=US`

## Verification

- `npm run build`
- `npm test -- --runInBand --testPathPatterns="yellow-card.adapter|get-deposit-channels.use-case"`
- `npm run test:e2e -- --runInBand --testPathPatterns="app-config.controller"`
- `npm run schema:check:mobile`
- `npm run smoke:mobile:api`
- `COUNTRY_CODE=US npm run smoke:mobile:api`

## Notes

- Local Blnk remains unavailable in this workstation run, so startup logs include
  expected `localhost:5001` connection warnings. The API still starts and the
  mobile smoke path passes with mock external rails enabled.
- `schema:check:mobile` still warns that the local migration ledger is empty
  while app tables exist. This is a local database drift warning; strict mode is
  expected to fail until the local migration ledger is repaired.
