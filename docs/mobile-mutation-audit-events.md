# Mobile Mutation Audit Events

Korido API emits structured audit records for mobile-facing `POST`, `PUT`, `PATCH`, and `DELETE` requests through `MobileMutationAuditInterceptor`.

The interceptor records the actor, resource, route, handler, correlation id, duration, params, query, request body, result identifiers, and error metadata. It intentionally skips operational/admin/reporting routes that are not mobile product actions.

Sensitive mobile values are never logged in audit details:

- PINs, OTPs, access tokens, refresh tokens, authorization headers, cookies, JWS values, FCM tokens, card secrets, account identifiers, and private keys are redacted.
- Wallet addresses are masked to prefix and suffix only.
- Phone numbers and emails are masked.

This gives support and reconciliation enough route-level evidence to trace user actions without exposing secrets in logs.
