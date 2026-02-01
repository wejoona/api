-- Rollback Script for: 1737600000000-AddAdminFieldsAndAuditLog
-- Description: Removes admin fields from users and drops audit/metrics tables
-- WARNING: This will delete all audit log history

BEGIN;

-- Drop tables
DROP TABLE IF EXISTS "scheduled_jobs" CASCADE;
DROP TABLE IF EXISTS "system_metrics" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;

-- Drop indexes on users table
DROP INDEX IF EXISTS "IDX_users_status";
DROP INDEX IF EXISTS "IDX_users_role";

-- Remove admin columns from users table
ALTER TABLE "users"
    DROP COLUMN IF EXISTS "role",
    DROP COLUMN IF EXISTS "status",
    DROP COLUMN IF EXISTS "suspended_at",
    DROP COLUMN IF EXISTS "suspended_reason";

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1737600000000-AddAdminFieldsAndAuditLog completed successfully';
END $$;
