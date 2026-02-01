-- Rollback Script for: 1741900000000-CreateWatchlistTables
-- Description: Drops watchlist_matches and watchlist_entries tables from compliance schema
-- WARNING: This will delete all sanctions/PEP screening data

BEGIN;

-- Drop tables in dependency order
DROP TABLE IF EXISTS "compliance"."watchlist_matches" CASCADE;
DROP TABLE IF EXISTS "compliance"."watchlist_entries" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "compliance"."watchlist_match_type_enum" CASCADE;
DROP TYPE IF EXISTS "compliance"."watchlist_match_status_enum" CASCADE;
DROP TYPE IF EXISTS "compliance"."watchlist_list_type_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741900000000-CreateWatchlistTables completed successfully';
END $$;
