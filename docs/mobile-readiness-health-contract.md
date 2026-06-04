# Mobile Readiness Health Contract

`GET /api/v1/health/mobile-readiness` separates three concerns:

- `app`: core API dependencies required to accept traffic, currently database, Redis, and Blnk.
- `providers`: external provider health or skipped state, currently Circle, Stellar, and Yellow Card.
- `features`: product availability flags for deposits, external withdrawals, cards, bank linking, bill payments, and bulk payments.
- `providerMode`: sanitized mode metadata nested under provider entries where relevant. It exposes mode/configuration booleans and mode status only; it must not expose raw URLs, API keys, tokens, database names, ledger IDs, or provider exception bodies.

The top-level status is:

- `ready`: app dependencies are up and providers are not down.
- `degraded`: app dependencies are up but one or more external providers are down.
- `not_ready`: at least one core app dependency is down.

This endpoint is for mobile/API operators and dashboard clients. Existing liveness/readiness probes remain unchanged.

Provider mode semantics:

- `mock`: allowed only outside production-like environments.
- `enabled`: live mode has the minimum required configuration.
- `disabled`: feature/provider is intentionally off.
- `misconfigured`: production-like live configuration is missing or mock mode was requested.
- `review_required`: configuration is usable but requires operator review before production pilot use.
