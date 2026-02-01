-- Rollback Script for: 1741300000000-CreateSessionsTable
-- Description: Drops sessions table from auth schema
-- WARNING: This will invalidate all active user sessions (users will need to re-login)

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "auth"."sessions" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741300000000-CreateSessionsTable completed successfully';
    RAISE WARNING 'All active sessions have been invalidated - users will need to re-login';
END $$;
