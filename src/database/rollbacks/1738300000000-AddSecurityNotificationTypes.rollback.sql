-- Rollback Script for: 1738300000000-AddSecurityNotificationTypes
-- Description: Attempts to remove security notification types from enum
-- NOTE: PostgreSQL does not support removing enum values - this is a NO-OP

BEGIN;

-- PostgreSQL limitation: Cannot remove enum values
-- The following values will remain in the enum but can be safely ignored:
-- - withdrawal_pending
-- - new_device_login
-- - large_transaction
-- - address_whitelisted
-- - security_alert
-- - price_alert
-- - weekly_summary

-- Optional: Update any notifications using these types to 'system' type
UPDATE "notifications"
SET "type" = 'system'::notification_type_enum
WHERE "type" IN (
    'withdrawal_pending',
    'new_device_login',
    'large_transaction',
    'address_whitelisted',
    'security_alert',
    'price_alert',
    'weekly_summary'
)::notification_type_enum[];

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Note: Enum values remain but are no longer used. This is safe.';
    RAISE NOTICE 'Rollback of 1738300000000-AddSecurityNotificationTypes completed (no-op)';
END $$;
