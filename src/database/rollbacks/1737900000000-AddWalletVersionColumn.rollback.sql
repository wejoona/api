-- Rollback Script for: 1737900000000-AddWalletVersionColumn
-- Description: Removes version column from wallets table (used for optimistic locking)
-- NOTE: This may affect concurrent transaction handling

BEGIN;

-- Remove version column from wallets table
ALTER TABLE "wallets"
    DROP COLUMN IF EXISTS "version";

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737900000000-AddWalletVersionColumn completed successfully';
END $$;
