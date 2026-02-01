-- Rollback Script for: 1738600000000-CreateNotificationPreferencesTable
-- Description: Drops notification_preferences table
-- WARNING: This will delete all user notification preferences

BEGIN;

-- Drop index
DROP INDEX IF EXISTS "IDX_notification_preferences_user_id";

-- Drop table (foreign key is dropped automatically)
DROP TABLE IF EXISTS "notification_preferences" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738600000000-CreateNotificationPreferencesTable completed successfully';
END $$;
