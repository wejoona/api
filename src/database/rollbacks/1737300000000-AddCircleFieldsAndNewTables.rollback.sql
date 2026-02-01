-- Rollback Script for: 1737300000000-AddCircleFieldsAndNewTables
-- Description: Removes Circle integration fields and ledger/transfer/notification tables
-- WARNING: This will delete all transfer and notification history

BEGIN;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "device_tokens" CASCADE;
DROP TABLE IF EXISTS "transfers" CASCADE;
DROP TABLE IF EXISTS "ledger_entries" CASCADE;
DROP TABLE IF EXISTS "ledger_transactions" CASCADE;
DROP TABLE IF EXISTS "ledger_accounts" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "notification_status_enum" CASCADE;
DROP TYPE IF EXISTS "notification_type_enum" CASCADE;
DROP TYPE IF EXISTS "device_platform_enum" CASCADE;
DROP TYPE IF EXISTS "transfer_status_enum" CASCADE;
DROP TYPE IF EXISTS "transfer_type_enum" CASCADE;
DROP TYPE IF EXISTS "ledger_entry_type_enum" CASCADE;
DROP TYPE IF EXISTS "ledger_transaction_status_enum" CASCADE;
DROP TYPE IF EXISTS "ledger_transaction_type_enum" CASCADE;
DROP TYPE IF EXISTS "ledger_account_category_enum" CASCADE;
DROP TYPE IF EXISTS "ledger_account_type_enum" CASCADE;

-- Remove Circle columns from wallets table
DROP INDEX IF EXISTS "IDX_wallets_circle_wallet_id";
ALTER TABLE "wallets"
    DROP COLUMN IF EXISTS "circle_wallet_id",
    DROP COLUMN IF EXISTS "circle_wallet_address";

-- Reset wallet currency default back to USD
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- Remove Circle columns from users table
DROP INDEX IF EXISTS "IDX_users_circle_user_id";
ALTER TABLE "users"
    DROP COLUMN IF EXISTS "circle_user_id",
    DROP COLUMN IF EXISTS "circle_user_token";

COMMIT;

-- Post-rollback verification
DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737300000000-AddCircleFieldsAndNewTables completed successfully';
END $$;
