-- Rollback Script for: 1741600000000-CreateSupportTicketsTable
-- Description: Drops support_tickets table and enum types from system schema
-- WARNING: This will delete all support ticket history

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "system"."support_tickets" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "system"."ticket_status" CASCADE;
DROP TYPE IF EXISTS "system"."ticket_priority" CASCADE;
DROP TYPE IF EXISTS "system"."ticket_category" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741600000000-CreateSupportTicketsTable completed successfully';
END $$;
