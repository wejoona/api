-- Rollback Script for: 1737700000000-AddUserPinHash
-- Description: Removes PIN-related columns from users table
-- WARNING: Users will need to reset their PINs after re-running the migration

BEGIN;

-- Remove PIN columns from users table
ALTER TABLE "users"
    DROP COLUMN IF EXISTS "pin_locked_until",
    DROP COLUMN IF EXISTS "pin_attempts",
    DROP COLUMN IF EXISTS "pin_set_at",
    DROP COLUMN IF EXISTS "pin_hash";

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737700000000-AddUserPinHash completed successfully';
END $$;
