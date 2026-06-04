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
- Extended smoke coverage from deposit discovery to deposit initiation:
  - selects the first active deposit channel for the country/currency
  - posts `/wallet/deposit`
  - verifies `/wallet/transactions/deposit/:transactionId/status`
  - verifies `/wallet/transactions/:transactionId`
- Extended contact discovery smoke coverage:
  - creates a second verified user in the same country
  - checks the current user's phone book against that verified contact
  - asserts `/contacts/check` returns `isKoridoUser` and `userId` for the match
- Tightened device/session behavior:
  - unauthenticated `/sessions` and `/devices` calls return `401`
  - revoking one device also revokes sessions attached to that device
  - revoking all devices also revokes all user sessions
  - smoke coverage now registers and revokes a device through the mobile API
- Added mobile waitlist/stay-informed smoke coverage:
  - posts `/feature-subscriptions` with `featureKey`, `source`, phone, country,
    locale, platform, app version, and screen metadata
  - asserts the response remains feature-specific, active, and region-aware

## Verification

- `npm run build`
- `npm test -- --runInBand --testPathPatterns="yellow-card.adapter|get-deposit-channels.use-case"`
- `npm test -- --runInBand --testPathPatterns="device.service"`
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
