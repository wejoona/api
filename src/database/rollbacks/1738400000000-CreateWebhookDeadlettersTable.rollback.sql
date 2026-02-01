-- Rollback Script for: 1738400000000-CreateWebhookDeadlettersTable
-- Description: Drops webhook_deadletters table
-- WARNING: This will delete all failed webhook records

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS "IDX_webhook_deadletters_provider";
DROP INDEX IF EXISTS "IDX_webhook_deadletters_event_type";
DROP INDEX IF EXISTS "IDX_webhook_deadletters_webhook_id";
DROP INDEX IF EXISTS "IDX_webhook_deadletters_status";

-- Drop table
DROP TABLE IF EXISTS "webhook_deadletters" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738400000000-CreateWebhookDeadlettersTable completed successfully';
END $$;
