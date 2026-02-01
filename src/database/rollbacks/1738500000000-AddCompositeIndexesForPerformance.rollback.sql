-- Rollback Script for: 1738500000000-AddCompositeIndexesForPerformance
-- Description: Removes composite indexes and restores original single-column indexes
-- NOTE: This may impact query performance

BEGIN;

-- Drop composite indexes
DROP INDEX IF EXISTS "idx_transactions_wallet_date";
DROP INDEX IF EXISTS "idx_transfers_sender_date";
DROP INDEX IF EXISTS "idx_notifications_user_status";

-- Recreate original single-column indexes
CREATE INDEX IF NOT EXISTS "IDX_transactions_wallet_id" ON "transactions" ("wallet_id");
CREATE INDEX IF NOT EXISTS "IDX_transactions_type" ON "transactions" ("type");
CREATE INDEX IF NOT EXISTS "IDX_transactions_status" ON "transactions" ("status");
CREATE INDEX IF NOT EXISTS "IDX_transactions_created_at" ON "transactions" ("created_at" DESC);

-- Update statistics
ANALYZE transactions;
ANALYZE transfers;
ANALYZE notifications;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738500000000-AddCompositeIndexesForPerformance completed successfully';
END $$;
