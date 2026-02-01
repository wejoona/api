-- Rollback Script for: 1742200000000-CreateComplianceCasesTables
-- Description: Drops compliance case management tables from compliance schema
-- WARNING: This will delete all compliance case history

BEGIN;

-- Drop function and sequence first
DROP FUNCTION IF EXISTS "compliance"."generate_case_number"();
DROP SEQUENCE IF EXISTS "compliance"."case_number_seq";

-- Drop tables in dependency order
DROP TABLE IF EXISTS "compliance"."case_evidence" CASCADE;
DROP TABLE IF EXISTS "compliance"."case_notes" CASCADE;
DROP TABLE IF EXISTS "compliance"."cases" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "compliance"."evidence_type" CASCADE;
DROP TYPE IF EXISTS "compliance"."case_priority" CASCADE;
DROP TYPE IF EXISTS "compliance"."case_status" CASCADE;
DROP TYPE IF EXISTS "compliance"."case_type" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1742200000000-CreateComplianceCasesTables completed successfully';
END $$;
