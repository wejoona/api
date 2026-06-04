# Korido API/Backend Readiness Objectives - Pass 13

Purpose: make backend/API readiness recursive and executable instead of relying on manual route memory. This pass focuses on local live API smoke for dogfood-critical mobile screens.

## Recursive Backend/API Objective Checklist

- [x] Confirm the active mobile API target and backend process.
- [x] Rebuild and restart the local API from the latest backend tree.
- [x] Smoke public API routes used before auth.
- [x] Smoke auth register and OTP verification with dev OTP `123456`.
- [x] Smoke authenticated wallet bootstrap routes.
- [x] Smoke transaction history and transaction stats routes.
- [x] Smoke notification feed and unread count routes.
- [x] Smoke contacts lookup and phone-book registration check routes.
- [x] Smoke active sessions and devices routes.
- [x] Smoke user limits, limit usage, and data export routes.
- [x] Smoke feature flags and feature subscription routes.
- [x] Add a reusable backend command for this smoke pass.
- [x] Add/keep mobile parser coverage for the live session response envelope.

## Execution Notes

### API Target And Process - 2026-06-04

Status: complete.

Confirmed state:

- Mobile development API default is `http://127.0.0.1:3401/api/v1` in `mobile/lib/services/api/api_client.dart`.
- Production API default is `https://api.joonapay.com/api/v1`.
- A stale local API process was running from `/private/tmp/korido-api-main-buildfix/dist/src/main`.
- Before rebuild, `GET /user/limits/usage` returned 404 even though source and tests contained the route.

Resolution:

- Rebuilt backend with `npm run build`.
- Restarted only the local API process on port `3401`.
- Re-ran live smoke against the rebuilt API.

### Live Local API Smoke - 2026-06-04

Status: complete.

Passing route families:

- `GET /health`
- `GET /config/countries`
- `POST /auth/register`
- `POST /auth/verify-otp`
- `GET /user/profile`
- `POST /wallet/create`
- `GET /wallet`
- `GET /wallet/transactions?limit=5`
- `GET /wallet/transactions/stats`
- `GET /notifications`
- `GET /notifications/unread-count`
- `GET /contacts`
- `GET /contacts/lookup?query=0700`
- `POST /contacts/check` with mobile-compatible `phoneNumbers`
- `GET /sessions`
- `GET /devices`
- `GET /user/limits`
- `GET /user/limits/usage`
- `GET /user/data-export?format=json`
- `GET /feature-flags/me`
- `GET /feature-subscriptions`

Expected behavior:

- `GET /wallet` can return 404 before wallet creation for a new user.
- `POST /wallet/create` then creates the local mock-backed wallet.

Local dependency notes:

- VerifyHQ is running locally and accepts dev OTP `123456`.
- Bill Pay is running locally.
- Circle, Yellow Card, SMS, and push are in mock mode.
- Blnk/Reconciliation on `localhost:5001` are not running locally; startup logs warn but wallet bootstrap still works with current mock/degraded wallet behavior.

### Reusable Command

Status: complete.

Added:

```bash
npm run smoke:mobile:api
```

Environment overrides:

```bash
API_URL=http://127.0.0.1:3401/api/v1 PHONE=+2250700000000 OTP=123456 COUNTRY_CODE=CI npm run smoke:mobile:api
```

### Session Envelope Guardrail

Status: complete.

Backend returns:

```json
{
  "sessions": [],
  "items": [],
  "total": 0
}
```

Mobile parser accepts both this object envelope and the legacy raw array shape.
