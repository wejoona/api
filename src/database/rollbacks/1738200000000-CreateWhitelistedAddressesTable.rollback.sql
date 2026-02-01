-- Rollback Script for: 1738200000000-CreateWhitelistedAddressesTable
-- Description: Drops whitelisted_addresses table
-- WARNING: This will delete all whitelisted crypto addresses

BEGIN;

-- Drop unique constraint
ALTER TABLE "whitelisted_addresses" DROP CONSTRAINT IF EXISTS "UQ_whitelisted_addresses_user_address";

-- Drop indexes
DROP INDEX IF EXISTS "IDX_whitelisted_addresses_user_id";
DROP INDEX IF EXISTS "IDX_whitelisted_addresses_address";
DROP INDEX IF EXISTS "IDX_whitelisted_addresses_status";

-- Drop table
DROP TABLE IF EXISTS "whitelisted_addresses" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738200000000-CreateWhitelistedAddressesTable completed successfully';
END $$;
