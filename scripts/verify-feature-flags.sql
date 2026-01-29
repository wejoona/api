-- Feature Flags Verification Script
-- Run this after migration to verify correct setup

\echo '========================================='
\echo 'Feature Flags Verification Script'
\echo '========================================='
\echo ''

-- 1. Check if table exists
\echo '1. Checking if feature_flags table exists...'
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'system'
  AND table_name = 'feature_flags'
) AS table_exists;
\echo ''

-- 2. Check table structure
\echo '2. Checking table structure...'
\d system.feature_flags
\echo ''

-- 3. Check indexes
\echo '3. Checking indexes...'
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'system'
AND tablename = 'feature_flags'
ORDER BY indexname;
\echo ''

-- 4. Count seeded flags
\echo '4. Counting seeded feature flags...'
SELECT COUNT(*) as total_flags
FROM system.feature_flags;
\echo ''

-- 5. List all seeded flags
\echo '5. Listing all seeded flags...'
SELECT
  key,
  name,
  is_enabled,
  rollout_percentage,
  CASE
    WHEN array_length(enabled_countries, 1) > 0
    THEN array_length(enabled_countries, 1)
    ELSE 0
  END as country_restrictions,
  CASE
    WHEN array_length(platforms, 1) > 0
    THEN array_length(platforms, 1)
    ELSE 0
  END as platform_restrictions
FROM system.feature_flags
ORDER BY key;
\echo ''

-- 6. Check enabled flags
\echo '6. Checking enabled flags (should be 6)...'
SELECT key, name, rollout_percentage
FROM system.feature_flags
WHERE is_enabled = true
ORDER BY key;
\echo ''

-- 7. Check disabled flags
\echo '7. Checking disabled flags (should be 2)...'
SELECT key, name
FROM system.feature_flags
WHERE is_enabled = false
ORDER BY key;
\echo ''

-- 8. Verify constraints
\echo '8. Checking rollout_percentage constraints...'
SELECT
  key,
  rollout_percentage,
  CASE
    WHEN rollout_percentage >= 0 AND rollout_percentage <= 100
    THEN 'VALID'
    ELSE 'INVALID'
  END as constraint_status
FROM system.feature_flags
ORDER BY key;
\echo ''

-- 9. Test unique constraint on key
\echo '9. Testing unique constraint on key (should fail)...'
DO $$
BEGIN
  BEGIN
    INSERT INTO system.feature_flags (key, name)
    VALUES ('external_transfers', 'Duplicate Test');
    RAISE NOTICE 'FAIL: Unique constraint not working!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: Unique constraint working correctly';
  END;
END $$;
\echo ''

-- 10. Test rollout_percentage check constraint
\echo '10. Testing rollout_percentage check constraint (should fail)...'
DO $$
BEGIN
  BEGIN
    INSERT INTO system.feature_flags (key, name, rollout_percentage)
    VALUES ('test_invalid_percentage', 'Test', 150);
    RAISE NOTICE 'FAIL: Check constraint not working!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: Check constraint working correctly';
  END;
END $$;
\echo ''

-- 11. Check default values
\echo '11. Verifying default values...'
INSERT INTO system.feature_flags (key, name)
VALUES ('test_defaults', 'Test Defaults');

SELECT
  key,
  is_enabled,
  rollout_percentage,
  array_length(enabled_user_ids, 1) as enabled_users_count,
  array_length(disabled_user_ids, 1) as disabled_users_count,
  array_length(enabled_countries, 1) as countries_count,
  array_length(platforms, 1) as platforms_count
FROM system.feature_flags
WHERE key = 'test_defaults';

-- Clean up test data
DELETE FROM system.feature_flags WHERE key = 'test_defaults';
\echo ''

-- 12. Test JSON metadata support
\echo '12. Testing JSONB metadata support...'
UPDATE system.feature_flags
SET metadata = '{"test": "value", "nested": {"key": "value"}}'::jsonb
WHERE key = 'external_transfers';

SELECT key, metadata
FROM system.feature_flags
WHERE key = 'external_transfers';

-- Reset metadata
UPDATE system.feature_flags
SET metadata = NULL
WHERE key = 'external_transfers';
\echo ''

-- 13. Test timestamp handling
\echo '13. Testing timestamp handling...'
UPDATE system.feature_flags
SET starts_at = NOW(), ends_at = NOW() + INTERVAL '30 days'
WHERE key = 'external_transfers';

SELECT key, starts_at, ends_at
FROM system.feature_flags
WHERE key = 'external_transfers';

-- Reset timestamps
UPDATE system.feature_flags
SET starts_at = NULL, ends_at = NULL
WHERE key = 'external_transfers';
\echo ''

-- 14. Test array operations
\echo '14. Testing array operations...'
UPDATE system.feature_flags
SET
  enabled_countries = ARRAY['CIV', 'SEN', 'MLI'],
  platforms = ARRAY['ios', 'android']
WHERE key = 'external_transfers';

SELECT key, enabled_countries, platforms
FROM system.feature_flags
WHERE key = 'external_transfers';

-- Reset arrays
UPDATE system.feature_flags
SET enabled_countries = '{}', platforms = '{}'
WHERE key = 'external_transfers';
\echo ''

-- 15. Performance check
\echo '15. Running performance test (1000 lookups)...'
\timing on
DO $$
DECLARE
  i INTEGER;
  result RECORD;
BEGIN
  FOR i IN 1..1000 LOOP
    SELECT * INTO result
    FROM system.feature_flags
    WHERE key = 'external_transfers';
  END LOOP;
END $$;
\timing off
\echo ''

-- 16. Summary
\echo '========================================='
\echo 'Verification Summary'
\echo '========================================='
SELECT
  COUNT(*) as total_flags,
  COUNT(*) FILTER (WHERE is_enabled = true) as enabled_flags,
  COUNT(*) FILTER (WHERE is_enabled = false) as disabled_flags,
  COUNT(*) FILTER (WHERE rollout_percentage = 100) as full_rollout,
  COUNT(*) FILTER (WHERE rollout_percentage = 0) as zero_rollout,
  COUNT(*) FILTER (WHERE array_length(enabled_user_ids, 1) > 0) as with_user_whitelist,
  COUNT(*) FILTER (WHERE array_length(enabled_countries, 1) > 0) as with_country_restrictions
FROM system.feature_flags;
\echo ''

\echo 'Verification complete!'
\echo 'Expected: 8 total flags, 6 enabled, 2 disabled'
