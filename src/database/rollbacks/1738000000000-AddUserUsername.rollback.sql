-- Rollback Script for: 1738000000000-AddUserUsername
-- Description: Removes username column and index from users table
-- WARNING: Users will lose their usernames

BEGIN;

-- Drop index first
DROP INDEX IF EXISTS "IDX_users_username";

-- Remove username column
ALTER TABLE "users"
    DROP COLUMN IF EXISTS "username";

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738000000000-AddUserUsername completed successfully';
END $$;
