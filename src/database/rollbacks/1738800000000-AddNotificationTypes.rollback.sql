-- Rollback Script for: 1738800000000-AddNotificationTypes
-- Description: Attempts to remove notification types from enum
-- NOTE: PostgreSQL does not support removing enum values - this is a NO-OP

BEGIN;

-- PostgreSQL limitation: Cannot remove enum values
-- The following values will remain in the enum but can be safely ignored:
-- - transfer_complete
-- - deposit_complete
-- - withdrawal_complete
-- - kyc_update

-- Optional: Update any notifications using these types to equivalent types
UPDATE "notifications"
SET "type" = 'transfer_sent'::notification_type_enum
WHERE "type" = 'transfer_complete'::notification_type_enum;

UPDATE "notifications"
SET "type" = 'deposit_completed'::notification_type_enum
WHERE "type" = 'deposit_complete'::notification_type_enum;

UPDATE "notifications"
SET "type" = 'withdrawal_completed'::notification_type_enum
WHERE "type" = 'withdrawal_complete'::notification_type_enum;

UPDATE "notifications"
SET "type" = 'kyc_approved'::notification_type_enum
WHERE "type" = 'kyc_update'::notification_type_enum;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Note: Enum values remain but are no longer used. This is safe.';
    RAISE NOTICE 'Rollback of 1738800000000-AddNotificationTypes completed (no-op)';
END $$;
