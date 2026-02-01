-- Rollback Script for: 1741600000001-CreateTicketMessagesTable
-- Description: Drops ticket_messages table and message_sender_type enum from system schema
-- WARNING: This will delete all ticket message history

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "system"."ticket_messages" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "system"."message_sender_type" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741600000001-CreateTicketMessagesTable completed successfully';
END $$;
