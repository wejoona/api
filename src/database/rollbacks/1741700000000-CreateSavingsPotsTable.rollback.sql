-- Rollback Script for: 1741700000000-CreateSavingsPotsTable
-- Description: Drops savings_pots table and enum types from wallet schema
-- WARNING: This will delete all savings pot data

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "wallet"."savings_pots" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "wallet"."auto_deposit_frequency" CASCADE;
DROP TYPE IF EXISTS "wallet"."savings_pot_status" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741700000000-CreateSavingsPotsTable completed successfully';
END $$;
