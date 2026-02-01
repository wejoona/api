-- Rollback Script for: 1737800000000-CreateBlacklistedDevicesTable
-- Description: Drops the blacklisted_devices table
-- WARNING: This will delete all device blacklist data

BEGIN;

-- Drop table (indexes are dropped automatically with CASCADE)
DROP TABLE IF EXISTS "blacklisted_devices" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737800000000-CreateBlacklistedDevicesTable completed successfully';
END $$;
