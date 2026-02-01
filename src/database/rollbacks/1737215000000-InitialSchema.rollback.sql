-- Rollback Script for: 1737215000000-InitialSchema
-- Description: Drops the initial schema tables (users, wallets, transactions)
-- WARNING: This will permanently delete all user data. Use with extreme caution.
-- DEPENDENCIES: This migration is the foundation. Rolling it back requires rolling back ALL subsequent migrations first.

-- Pre-rollback checks
DO $$
BEGIN
    -- Check for dependent data
    IF EXISTS (SELECT 1 FROM "transactions" LIMIT 1) THEN
        RAISE WARNING 'transactions table contains data that will be deleted';
    END IF;
    IF EXISTS (SELECT 1 FROM "wallets" LIMIT 1) THEN
        RAISE WARNING 'wallets table contains data that will be deleted';
    END IF;
    IF EXISTS (SELECT 1 FROM "users" LIMIT 1) THEN
        RAISE WARNING 'users table contains data that will be deleted';
    END IF;
END $$;

-- Begin rollback
BEGIN;

-- Drop indexes first (in reverse order of creation)
DROP INDEX IF EXISTS "IDX_transactions_created_at";
DROP INDEX IF EXISTS "IDX_transactions_type";
DROP INDEX IF EXISTS "IDX_transactions_status";
DROP INDEX IF EXISTS "IDX_transactions_yellow_card_ref";
DROP INDEX IF EXISTS "IDX_transactions_wallet_id";
DROP INDEX IF EXISTS "IDX_wallets_yellow_card_wallet_id";
DROP INDEX IF EXISTS "IDX_wallets_user_id";
DROP INDEX IF EXISTS "IDX_users_phone";

-- Drop tables in dependency order (children before parents)
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "wallets" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Note: uuid-ossp extension is NOT dropped as it may be used by other parts of the database

COMMIT;

-- Post-rollback verification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Rollback failed: users table still exists';
    END IF;
    RAISE NOTICE 'Rollback of 1737215000000-InitialSchema completed successfully';
END $$;
