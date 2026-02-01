-- Rollback Script for: 1738700000000-CreateFcmTokensTable
-- Description: Drops fcm_tokens table and fcm_platform_enum
-- WARNING: This will delete all FCM token registrations (push notifications will stop)

BEGIN;

-- Drop foreign key
ALTER TABLE "fcm_tokens" DROP CONSTRAINT IF EXISTS "FK_fcm_tokens_user";

-- Drop indexes
DROP INDEX IF EXISTS "IDX_fcm_tokens_cleanup";
DROP INDEX IF EXISTS "IDX_fcm_tokens_token";
DROP INDEX IF EXISTS "IDX_fcm_tokens_user_active";
DROP INDEX IF EXISTS "IDX_fcm_tokens_user_id";

-- Drop table
DROP TABLE IF EXISTS "fcm_tokens" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "fcm_platform_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738700000000-CreateFcmTokensTable completed successfully';
END $$;
