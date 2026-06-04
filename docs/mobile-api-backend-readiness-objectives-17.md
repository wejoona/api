# Korido API/Backend Readiness Objectives - Pass 17

Purpose: make backend schema readiness explicit for mobile dogfooding after live API smoke exposed local/prod-like schema drift.

## Recursive Backend/API Objective Checklist

- [x] Extend mobile dogfood schema check to cover push-token startup fields.
- [x] Extend mobile dogfood schema check to cover audit mutation `event_type`.
- [x] Detect migration-ledger drift where application tables exist but TypeORM thinks no migrations have run.
- [x] Add strict schema check mode for deployment/preflight use.
- [x] Add/repair composite uniqueness for notification device tokens.
- [x] Run normal schema check.
- [x] Run strict schema check and confirm it fails on the current local migration-ledger drift.
- [x] Run build and focused backend verification.
- [x] Commit and push if verification passes.

## Execution Notes

### Schema Drift Coverage

Status: complete.

Live smoke previously caught issues that `schema:check:mobile` missed:

- `device_tokens.app_version`
- `device_tokens.os_version`
- `audit_logs.event_type`
- `device_tokens(user_id, token)` composite uniqueness

Resolution:

- Added `public.device_tokens` to `scripts/check-mobile-dogfood-schema.ts`.
- Added `audit_logs.event_type` to the required audit schema.
- Added a normal warning for empty migration ledgers on partially existing schemas.
- Added strict mode through `SCHEMA_CHECK_STRICT_MIGRATIONS=true`.
- Added `npm run schema:check:mobile:strict`.
- Added entity-level composite unique index metadata for `DeviceTokenOrmEntity`.
- Added migration `1745900000000-EnsureDeviceTokenUserTokenIndex.ts`.

### Local Migration Ledger State

Status: known environment issue.

Evidence:

- `npm run schema:check:mobile` passes but warns that the migration ledger is empty while application tables exist.
- `SCHEMA_CHECK_STRICT_MIGRATIONS=true npm run schema:check:mobile` fails intentionally on that condition.

Reason:

- This local DB schema was created or repaired outside TypeORM's migration ledger.
- Running `npm run migration:run` directly can replay historical migrations and collide on existing objects.

Operational rule:

- Use normal schema check during local dogfood smoke.
- Use strict schema check before preparing a clean/staging/prod environment.
- Repair the migration ledger deliberately; do not blindly run all migrations against a partially existing schema.

Verification:

- `npm run build` passed.
- `npm run test:e2e -- --runInBand --testPathPatterns="device.controller|notification.controller"` passed.
- `npm run schema:check:mobile` passed with the expected migration-ledger warning.
- `npm run schema:check:mobile:strict` failed intentionally on the current local migration-ledger drift.
