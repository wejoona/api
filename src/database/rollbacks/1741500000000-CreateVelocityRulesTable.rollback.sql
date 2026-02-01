-- Rollback Script for: 1741500000000-CreateVelocityRulesTable
-- Description: Drops velocity_rules table and enum types from compliance schema
-- WARNING: This will delete all velocity/limit rules

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "compliance"."velocity_rules" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "compliance"."velocity_rule_action_enum" CASCADE;
DROP TYPE IF EXISTS "compliance"."velocity_rule_type_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741500000000-CreateVelocityRulesTable completed successfully';
END $$;
