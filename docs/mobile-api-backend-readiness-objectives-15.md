# Korido API/Backend Readiness Objectives - Pass 15

Purpose: continue recursive backend/API readiness by covering authenticated background routes the mobile app calls outside visible screen loads.

## Recursive Backend/API Objective Checklist

- [x] Identify mobile bootstrap/background API calls not covered by reusable smoke.
- [x] Confirm `POST /risk/session` is active in mobile app bootstrap.
- [x] Confirm response shape expected by mobile: `success.data.sessionRiskToken`, `riskLevel`, `deviceTrust`, and `requiredActions`.
- [x] Add `POST /risk/session` to `npm run smoke:mobile:api`.
- [x] Run live local smoke against the rebuilt API.
- [x] Run focused risk controller E2E coverage.
- [x] Commit and push if verification passes.

## Execution Notes

### Session Risk Bootstrap

Status: complete.

Mobile source:

- `mobile/lib/services/risk/session_risk_provider.dart`
- `mobile/lib/features/wallet/providers/app_bootstrap_provider.dart`

Backend source:

- `src/modules/risk/application/controllers/risk.controller.ts`

Contract:

- Mobile sends `deviceFingerprint` and `appVersion`.
- Backend returns an object envelope with `success: true` and `data`.
- Mobile stores `data.sessionRiskToken` into the security headers interceptor as `X-Risk-Session`.

Resolution:

- Reusable live smoke now posts a non-sensitive synthetic device fingerprint to `/risk/session` after OTP login.

Verification:

- `npm run test:e2e -- --runInBand --testPathPatterns="risk.controller"` passed.
- `npm run smoke:mobile:api` passed with `POST /risk/session -> 200 success,data`.
