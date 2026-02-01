-- Rollback Script for: 1738000000001-CreateBillPaymentsTables
-- Description: Drops bill_payments and bill_providers tables
-- WARNING: This will delete all bill payment history and provider configurations

BEGIN;

-- Drop bill_payments table first (has FK to bill_providers)
DROP TABLE IF EXISTS "bill_payments" CASCADE;

-- Drop bill_providers table
DROP TABLE IF EXISTS "bill_providers" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738000000001-CreateBillPaymentsTables completed successfully';
END $$;
