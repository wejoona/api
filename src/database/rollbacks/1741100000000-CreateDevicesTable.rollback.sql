-- Rollback Script for: 1741100000000-CreateDevicesTable
-- Description: Drops devices table and device_platform enum from auth schema
-- WARNING: This will delete all device registration data

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "auth"."devices" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "auth"."device_platform" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741100000000-CreateDevicesTable completed successfully';
END $$;
