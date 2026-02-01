-- Rollback Script for: 1739000000000-CreateMerchantTables
-- Description: Drops merchant tables and enum types
-- WARNING: This will delete all merchant data and payment history

BEGIN;

-- Drop composite indexes
DROP INDEX IF EXISTS "idx_merchant_payments_customer_date";
DROP INDEX IF EXISTS "idx_merchant_payments_merchant_date";

-- Drop tables in dependency order
DROP TABLE IF EXISTS "merchant_payments" CASCADE;
DROP TABLE IF EXISTS "payment_requests" CASCADE;
DROP TABLE IF EXISTS "merchants" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "merchant_payment_status_enum" CASCADE;
DROP TYPE IF EXISTS "payment_request_status_enum" CASCADE;
DROP TYPE IF EXISTS "merchant_status_enum" CASCADE;
DROP TYPE IF EXISTS "merchant_category_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1739000000000-CreateMerchantTables completed successfully';
END $$;
