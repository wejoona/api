-- Rollback Script for: 1741400000000-CreateFeatureFlagsTable
-- Description: Drops feature_flags table from system schema
-- WARNING: This will delete all feature flag configurations

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "system"."feature_flags" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741400000000-CreateFeatureFlagsTable completed successfully';
END $$;
