-- Rollback Script for: 1743000000000-CreateSlaConfigurationsTable
-- Description: Drops sla_configurations table from system schema
-- WARNING: This will delete all SLA configuration data

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "system"."sla_configurations" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1743000000000-CreateSlaConfigurationsTable completed successfully';
END $$;
