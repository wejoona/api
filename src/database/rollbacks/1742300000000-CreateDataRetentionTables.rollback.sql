-- Rollback Script for: 1742300000000-CreateDataRetentionTables
-- Description: Drops data retention tables and removes soft delete columns
-- WARNING: This will delete all data retention policies and deletion request history

BEGIN;

-- Remove soft delete columns from tables
ALTER TABLE "auth"."sessions"
    DROP COLUMN IF EXISTS "deleted_at";

ALTER TABLE "auth"."verifications"
    DROP COLUMN IF EXISTS "deleted_at";

-- webhook_deadletters might be in public or system schema depending on migration state
ALTER TABLE "webhook_deadletters"
    DROP COLUMN IF EXISTS "deleted_at";

-- Try system schema as well
DO $$
BEGIN
    EXECUTE 'ALTER TABLE "system"."webhook_deadletters" DROP COLUMN IF EXISTS "deleted_at"';
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- Drop tables
DROP TABLE IF EXISTS "system"."data_retention_logs" CASCADE;
DROP TABLE IF EXISTS "system"."data_deletion_requests" CASCADE;
DROP TABLE IF EXISTS "system"."retention_policies" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1742300000000-CreateDataRetentionTables completed successfully';
END $$;
