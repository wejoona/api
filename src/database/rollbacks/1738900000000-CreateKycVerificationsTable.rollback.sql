-- Rollback Script for: 1738900000000-CreateKycVerificationsTable
-- Description: Drops kyc_verifications and sub_accounts tables
-- WARNING: This will delete all KYC verification data

BEGIN;

-- Drop sub_accounts table first (less critical)
DROP TABLE IF EXISTS "sub_accounts" CASCADE;

-- Drop kyc_verifications table
DROP TABLE IF EXISTS "kyc_verifications" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738900000000-CreateKycVerificationsTable completed successfully';
END $$;
