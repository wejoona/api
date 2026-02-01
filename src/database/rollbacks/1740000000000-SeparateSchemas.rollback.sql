-- Rollback Script for: 1740000000000-SeparateSchemas
-- Description: Moves all tables back from custom schemas to public schema
-- WARNING: This is a complex rollback that requires careful execution
-- NOTE: This rollback is handled by the TypeORM migration down() method
-- Use: npm run migration:revert to execute via TypeORM

-- Schema mapping for reference:
-- auth: users, kyc_verifications, blacklisted_devices
-- wallet: wallets, transactions, transfers, whitelisted_addresses
-- merchant: merchants, payment_requests, merchant_payments
-- payments: bill_providers, bill_payments
-- compliance: monitoring_rules, compliance_reports, compliance_alerts, suspicious_activity_reports, transaction_alerts, user_alert_preferences
-- notifications: notifications, device_tokens, fcm_tokens, notification_preferences
-- referral: referrals, referral_stats
-- social: contacts
-- system: audit_logs, system_metrics, scheduled_jobs, webhook_deadletters, sub_accounts

BEGIN;

-- Function to safely move table back to public schema
CREATE OR REPLACE FUNCTION move_table_to_public(schema_name text, table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I.%I SET SCHEMA public', schema_name, table_name);
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table %.% does not exist, skipping', schema_name, table_name;
END;
$$ LANGUAGE plpgsql;

-- Move auth schema tables
SELECT move_table_to_public('auth', 'blacklisted_devices');
SELECT move_table_to_public('auth', 'kyc_verifications');
SELECT move_table_to_public('auth', 'users');

-- Move wallet schema tables
SELECT move_table_to_public('wallet', 'whitelisted_addresses');
SELECT move_table_to_public('wallet', 'transfers');
SELECT move_table_to_public('wallet', 'transactions');
SELECT move_table_to_public('wallet', 'wallets');

-- Move merchant schema tables
SELECT move_table_to_public('merchant', 'merchant_payments');
SELECT move_table_to_public('merchant', 'payment_requests');
SELECT move_table_to_public('merchant', 'merchants');

-- Move payments schema tables
SELECT move_table_to_public('payments', 'bill_payments');
SELECT move_table_to_public('payments', 'bill_providers');

-- Move compliance schema tables
SELECT move_table_to_public('compliance', 'user_alert_preferences');
SELECT move_table_to_public('compliance', 'transaction_alerts');
SELECT move_table_to_public('compliance', 'suspicious_activity_reports');
SELECT move_table_to_public('compliance', 'compliance_alerts');
SELECT move_table_to_public('compliance', 'compliance_reports');
SELECT move_table_to_public('compliance', 'monitoring_rules');

-- Move notifications schema tables
SELECT move_table_to_public('notifications', 'notification_preferences');
SELECT move_table_to_public('notifications', 'fcm_tokens');
SELECT move_table_to_public('notifications', 'device_tokens');
SELECT move_table_to_public('notifications', 'notifications');

-- Move referral schema tables
SELECT move_table_to_public('referral', 'referral_stats');
SELECT move_table_to_public('referral', 'referrals');

-- Move social schema tables
SELECT move_table_to_public('social', 'contacts');

-- Move system schema tables
SELECT move_table_to_public('system', 'sub_accounts');
SELECT move_table_to_public('system', 'webhook_deadletters');
SELECT move_table_to_public('system', 'scheduled_jobs');
SELECT move_table_to_public('system', 'system_metrics');
SELECT move_table_to_public('system', 'audit_logs');

-- Drop helper function
DROP FUNCTION move_table_to_public(text, text);

-- Drop empty schemas
DROP SCHEMA IF EXISTS "auth";
DROP SCHEMA IF EXISTS "wallet";
DROP SCHEMA IF EXISTS "merchant";
DROP SCHEMA IF EXISTS "payments";
DROP SCHEMA IF EXISTS "compliance";
DROP SCHEMA IF EXISTS "notifications";
DROP SCHEMA IF EXISTS "referral";
DROP SCHEMA IF EXISTS "social";
DROP SCHEMA IF EXISTS "system";

-- Reset search_path
DO $$
DECLARE
    db_name text;
BEGIN
    SELECT current_database() INTO db_name;
    EXECUTE format('ALTER DATABASE %I SET search_path TO public', db_name);
END $$;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1740000000000-SeparateSchemas completed successfully';
    RAISE NOTICE 'All tables have been moved back to public schema';
END $$;
