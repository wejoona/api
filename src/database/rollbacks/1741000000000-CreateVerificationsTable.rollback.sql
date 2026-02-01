-- Rollback Script for: 1741000000000-CreateVerificationsTable
-- Description: Drops verifications table and related enum types from auth schema
-- WARNING: This will delete all verification code history

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "auth"."verifications" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "auth"."verification_status" CASCADE;
DROP TYPE IF EXISTS "auth"."verification_type" CASCADE;
DROP TYPE IF EXISTS "auth"."verification_identifier_type" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741000000000-CreateVerificationsTable completed successfully';
END $$;
