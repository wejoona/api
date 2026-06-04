# Korido API/Backend Readiness Objectives - Pass 16

Purpose: continue recursive backend/API readiness by covering startup registration routes that run after login but before visible user actions.

## Recursive Backend/API Objective Checklist

- [x] Identify active mobile device registration route.
- [x] Identify active mobile notification token registration/removal routes.
- [x] Add `POST /devices/register` to reusable live smoke.
- [x] Add `POST /notifications/device-token` and `DELETE /notifications/device-token/:token` to reusable live smoke.
- [x] Run focused backend E2E coverage for devices and notifications.
- [x] Run live local smoke against the API.
- [x] Fix live schema/code drift discovered by smoke.
- [x] Commit and push if verification passes.

## Execution Notes

### Startup Device Registration

Status: complete.

Mobile source:

- `mobile/lib/services/device/device_registration_service.dart`
- `mobile/lib/features/settings/repositories/devices_repository.dart`

Contract:

- Mobile posts `deviceIdentifier`, `platform`, optional model/name/version fields, and metadata to `/devices/register`.
- Device registration is non-blocking on mobile login, but backend route health matters for trusted-device and session visibility.

### Push Token Registration

Status: complete.

Mobile source:

- `mobile/lib/services/notifications/notifications_service.dart`
- `mobile/lib/services/notifications/push_notification_service.dart`

Contract:

- Mobile posts token metadata to `/notifications/device-token`.
- Mobile removes a single token with `DELETE /notifications/device-token/:token`.

Resolution:

- Reusable smoke uses synthetic device and push token identifiers to exercise validation and persistence without requiring real APNs/FCM delivery.

### Schema Drift Found By Live Smoke

Status: complete.

Findings:

- `POST /notifications/device-token` initially returned `503 NOTIFICATION_DEPENDENCY_UNAVAILABLE`.
- Root cause was local DB schema drift: `device_tokens.app_version` and `device_tokens.os_version` were missing while the entity queried them.
- The migration `1745700000000-AddDeviceTokenRuntimeFields.ts` already exists, but the local `migrations` table is empty while the schema is partially present, so `npm run migration:run` tried replaying all migrations and collided on old indexes.
- Mobile mutation audit logging also exposed schema drift: the DB requires `audit_logs.event_type`, but `AuditService` was not writing it.

Resolution:

- Added `eventType` to the admin audit entity and write it from `AuditService`.
- Added idempotent migration `1745800000000-AddAuditLogEventType.ts` to backfill/default `audit_logs.event_type`.
- Applied targeted local schema repair for smoke only:
  - `device_tokens.app_version`
  - `device_tokens.os_version`
  - `audit_logs.event_type`

Verification:

- `npm run build` passed.
- `npm test -- --runInBand --testPathPatterns="audit.service|mobile-mutation-audit.interceptor|notification.controller|device.controller"` passed.
- `npm run test:e2e -- --runInBand --testPathPatterns="device.controller|notification.controller"` passed.
- `npm run smoke:mobile:api` passed, including:
  - `POST /devices/register -> 201`
  - `POST /notifications/device-token -> 201`
  - `DELETE /notifications/device-token/:token -> 204`
