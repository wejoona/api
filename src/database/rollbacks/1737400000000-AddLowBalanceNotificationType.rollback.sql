-- Rollback Script for: 1737400000000-AddLowBalanceNotificationType
-- Description: Attempts to remove 'low_balance' from notification_type_enum
-- NOTE: PostgreSQL does not support removing enum values directly without recreating the type
-- This is a NO-OP rollback - the enum value remains but is unused

BEGIN;

-- PostgreSQL limitation: Cannot remove enum values
-- The 'low_balance' value will remain in the enum but can be safely ignored
-- To truly remove it, you would need to:
-- 1. Create a new enum type without the value
-- 2. Update all columns using the enum to the new type
-- 3. Drop the old enum type
-- This is risky in production and the value being unused is harmless

-- Optional: Update any notifications using this type to 'system' type
UPDATE "notifications"
SET "type" = 'system'::notification_type_enum
WHERE "type" = 'low_balance'::notification_type_enum;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Note: low_balance enum value remains but is no longer used. This is safe.';
    RAISE NOTICE 'Rollback of 1737400000000-AddLowBalanceNotificationType completed (no-op)';
END $$;
