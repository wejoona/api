-- Rollback Script for: 1738100000000-CreateContactsTable
-- Description: Drops contacts table and all its constraints/indexes
-- WARNING: This will delete all saved contacts

BEGIN;

-- Drop unique constraints
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "UQ_contacts_user_phone";
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "UQ_contacts_user_wallet_address";
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "UQ_contacts_user_contact_user";

-- Drop indexes
DROP INDEX IF EXISTS "IDX_contacts_user_id";
DROP INDEX IF EXISTS "IDX_contacts_contact_user_id";
DROP INDEX IF EXISTS "IDX_contacts_phone";
DROP INDEX IF EXISTS "IDX_contacts_wallet_address";
DROP INDEX IF EXISTS "IDX_contacts_is_favorite";

-- Drop table
DROP TABLE IF EXISTS "contacts" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738100000000-CreateContactsTable completed successfully';
END $$;
