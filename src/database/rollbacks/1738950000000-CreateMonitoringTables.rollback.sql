-- Rollback Script for: 1738950000000-CreateMonitoringTables
-- Description: Drops monitoring tables (transaction_alerts, user_alert_preferences, monitoring_rules)
-- WARNING: This will delete all monitoring rules and alert history

BEGIN;

-- Drop tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS "monitoring_rules" CASCADE;
DROP TABLE IF EXISTS "user_alert_preferences" CASCADE;
DROP TABLE IF EXISTS "transaction_alerts" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1738950000000-CreateMonitoringTables completed successfully';
END $$;
