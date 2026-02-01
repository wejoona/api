-- Rollback Script for: 1741200000000-CreateBeneficiariesTable
-- Description: Drops beneficiaries table and beneficiary_account_type enum from wallet schema
-- WARNING: This will delete all saved beneficiaries

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "wallet"."beneficiaries" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "wallet"."beneficiary_account_type" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741200000000-CreateBeneficiariesTable completed successfully';
END $$;
