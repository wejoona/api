-- Rollback Script for: 1737500000000-CreateReferralTables
-- Description: Drops referral tables and referral_status_enum
-- WARNING: This will delete all referral data

BEGIN;

-- Drop tables
DROP TABLE IF EXISTS "referral_stats" CASCADE;
DROP TABLE IF EXISTS "referrals" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "referral_status_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737500000000-CreateReferralTables completed successfully';
END $$;
