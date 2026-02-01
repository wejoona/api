-- Rollback Script for: 1742000000000-CreateApiKeysTable
-- Description: Drops api_keys table from system schema
-- WARNING: This will invalidate all API keys

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "system"."api_keys" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1742000000000-CreateApiKeysTable completed successfully';
    RAISE WARNING 'All API keys have been invalidated';
END $$;
