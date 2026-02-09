-- ============================================================
-- TABLE SIZE Report for JoonaPay USDC Wallet
-- Purpose: Monitor database storage usage and growth trends
-- Usage: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f table-size-report.sql
-- ============================================================

\echo '============================================================'
\echo 'JoonaPay Database Size Analysis Report'
\echo 'Generated:' :DBNAME
\echo '============================================================'
\echo ''

-- Set output formatting
\pset format aligned
\pset border 2
\pset null '(null)'

-- ============================================================
-- 1. DATABASE OVERVIEW
-- ============================================================
\echo ''
\echo '>> DATABASE OVERVIEW'
\echo ''

SELECT
    current_database() AS "Database",
    pg_size_pretty(pg_database_size(current_database())) AS "Total Size",
    (SELECT count(*) FROM pg_stat_user_tables) AS "Table Count",
    (SELECT count(*) FROM pg_stat_user_indexes) AS "Index Count",
    pg_size_pretty((SELECT SUM(pg_relation_size(relid)) FROM pg_stat_user_tables)) AS "Tables Size",
    pg_size_pretty((SELECT SUM(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes)) AS "Indexes Size";

-- ============================================================
-- 2. TOP TABLES BY SIZE
-- ============================================================
\echo ''
\echo '>> TOP 25 TABLES BY SIZE'
\echo ''

SELECT
    ROW_NUMBER() OVER (ORDER BY pg_total_relation_size(relid) DESC) AS "Rank",
    schemaname || '.' || relname AS "Table",
    pg_size_pretty(pg_relation_size(relid)) AS "Table Size",
    pg_size_pretty(pg_indexes_size(relid)) AS "Index Size",
    pg_size_pretty(pg_total_relation_size(relid)) AS "Total Size",
    ROUND(100.0 * pg_total_relation_size(relid) / NULLIF(pg_database_size(current_database()), 0), 2) || '%' AS "% of DB",
    n_live_tup AS "Live Rows",
    n_dead_tup AS "Dead Rows",
    CASE
        WHEN n_live_tup > 0 THEN
            pg_size_pretty((pg_relation_size(relid) / n_live_tup)::bigint)
        ELSE 'N/A'
    END AS "Avg Row Size"
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 25;

-- ============================================================
-- 3. TOP INDEXES BY SIZE
-- ============================================================
\echo ''
\echo '>> TOP 25 INDEXES BY SIZE'
\echo ''

SELECT
    ROW_NUMBER() OVER (ORDER BY pg_relation_size(indexrelid) DESC) AS "Rank",
    schemaname || '.' || indexrelname AS "Index",
    schemaname || '.' || relname AS "Table",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Index Size",
    idx_scan AS "Scans",
    idx_tup_read AS "Tuples Read",
    idx_tup_fetch AS "Tuples Fetched",
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW USAGE'
        ELSE 'ACTIVE'
    END AS "Status"
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 25;

-- ============================================================
-- 4. JOONAPAY DOMAIN TABLES BREAKDOWN
-- ============================================================
\echo ''
\echo '>> JOONAPAY DOMAIN TABLES BREAKDOWN'
\echo ''

WITH domain_sizes AS (
    SELECT
        CASE
            WHEN relname ~* 'transaction' THEN 'Transactions'
            WHEN relname ~* 'wallet' THEN 'Wallets'
            WHEN relname ~* 'user' THEN 'Users'
            WHEN relname ~* 'beneficiar' THEN 'Beneficiaries'
            WHEN relname ~* 'session' THEN 'Sessions'
            WHEN relname ~* 'device' THEN 'Devices'
            WHEN relname ~* 'audit' OR relname ~* 'log' THEN 'Audit/Logs'
            WHEN relname ~* 'payment_link' THEN 'Payment Links'
            WHEN relname ~* 'exchange_rate' THEN 'Exchange Rates'
            WHEN relname ~* 'verification' THEN 'Verification'
            WHEN relname ~* 'feature' OR relname ~* 'flag' THEN 'Feature Flags'
            ELSE 'Other'
        END AS domain,
        pg_total_relation_size(relid) AS total_size,
        n_live_tup AS row_count
    FROM pg_stat_user_tables
)
SELECT
    domain AS "Domain",
    COUNT(*) AS "Tables",
    pg_size_pretty(SUM(total_size)) AS "Total Size",
    ROUND(100.0 * SUM(total_size) / NULLIF(pg_database_size(current_database()), 0), 2) || '%' AS "% of DB",
    SUM(row_count) AS "Total Rows"
FROM domain_sizes
GROUP BY domain
ORDER BY SUM(total_size) DESC;

-- ============================================================
-- 5. TABLE GROWTH ANALYSIS
-- ============================================================
\echo ''
\echo '>> TABLE ACTIVITY ANALYSIS'
\echo '   Insert/Update/Delete patterns'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    n_live_tup AS "Live Rows",
    pg_size_pretty(pg_relation_size(relid)) AS "Size",
    n_tup_ins AS "Inserts",
    n_tup_upd AS "Updates",
    n_tup_del AS "Deletes",
    n_tup_hot_upd AS "HOT Updates",
    CASE
        WHEN n_tup_upd > 0 THEN
            ROUND(100.0 * n_tup_hot_upd / n_tup_upd, 2) || '%'
        ELSE 'N/A'
    END AS "HOT Ratio",
    COALESCE(TO_CHAR(last_vacuum, 'YYYY-MM-DD'), '-') AS "Last Vacuum",
    COALESCE(TO_CHAR(last_analyze, 'YYYY-MM-DD'), '-') AS "Last Analyze"
FROM pg_stat_user_tables
WHERE (n_tup_ins + n_tup_upd + n_tup_del) > 0
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
LIMIT 20;

-- ============================================================
-- 6. UNUSED TABLES
-- ============================================================
\echo ''
\echo '>> POTENTIALLY UNUSED TABLES'
\echo '   Tables with no recent activity'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    pg_size_pretty(pg_total_relation_size(relid)) AS "Total Size",
    n_live_tup AS "Rows",
    seq_scan AS "Seq Scans",
    idx_scan AS "Index Scans",
    COALESCE(TO_CHAR(last_seq_scan, 'YYYY-MM-DD'), 'Never') AS "Last Seq Scan",
    COALESCE(TO_CHAR(last_idx_scan, 'YYYY-MM-DD'), 'Never') AS "Last Idx Scan"
FROM pg_stat_user_tables
WHERE (seq_scan + COALESCE(idx_scan, 0)) = 0
   OR (last_seq_scan < NOW() - INTERVAL '30 days' AND last_idx_scan < NOW() - INTERVAL '30 days')
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;

-- ============================================================
-- 7. INDEX SIZE VS TABLE SIZE RATIO
-- ============================================================
\echo ''
\echo '>> INDEX TO TABLE SIZE RATIO'
\echo '   High ratios may indicate over-indexing'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    pg_size_pretty(pg_relation_size(relid)) AS "Table Size",
    pg_size_pretty(pg_indexes_size(relid)) AS "Index Size",
    CASE
        WHEN pg_relation_size(relid) > 0 THEN
            ROUND(100.0 * pg_indexes_size(relid) / pg_relation_size(relid), 2) || '%'
        ELSE 'N/A'
    END AS "Index/Table Ratio",
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = relname) AS "Index Count",
    CASE
        WHEN pg_indexes_size(relid) > pg_relation_size(relid) * 2 THEN 'OVER-INDEXED'
        WHEN pg_indexes_size(relid) > pg_relation_size(relid) THEN 'HIGH'
        ELSE 'NORMAL'
    END AS "Assessment"
FROM pg_stat_user_tables
WHERE pg_relation_size(relid) > 1048576  -- > 1MB
ORDER BY pg_indexes_size(relid)::float / NULLIF(pg_relation_size(relid), 0) DESC
LIMIT 20;

-- ============================================================
-- 8. TOAST TABLE SIZES
-- ============================================================
\echo ''
\echo '>> TOAST TABLE SIZES'
\echo '   Large text/bytea columns stored separately'
\echo ''

SELECT
    c.relname AS "Table",
    pg_size_pretty(pg_relation_size(c.oid)) AS "Table Size",
    pg_size_pretty(pg_relation_size(t.oid)) AS "TOAST Size",
    ROUND(100.0 * pg_relation_size(t.oid) / NULLIF(pg_total_relation_size(c.oid), 0), 2) || '%' AS "TOAST %"
FROM pg_class c
JOIN pg_class t ON t.oid = c.reltoastrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND pg_relation_size(t.oid) > 1048576  -- > 1MB
ORDER BY pg_relation_size(t.oid) DESC
LIMIT 15;

-- ============================================================
-- 9. SCHEMA SIZES
-- ============================================================
\echo ''
\echo '>> SCHEMA SIZE BREAKDOWN'
\echo ''

SELECT
    schemaname AS "Schema",
    COUNT(*) AS "Tables",
    pg_size_pretty(SUM(pg_total_relation_size(relid))) AS "Total Size",
    ROUND(100.0 * SUM(pg_total_relation_size(relid)) / NULLIF(pg_database_size(current_database()), 0), 2) || '%' AS "% of DB",
    SUM(n_live_tup) AS "Total Rows"
FROM pg_stat_user_tables
GROUP BY schemaname
ORDER BY SUM(pg_total_relation_size(relid)) DESC;

-- ============================================================
-- 10. STORAGE RECOMMENDATIONS
-- ============================================================
\echo ''
\echo '>> STORAGE RECOMMENDATIONS'
\echo ''

-- Tables that might benefit from partitioning
WITH large_tables AS (
    SELECT
        schemaname,
        relname,
        pg_total_relation_size(relid) AS total_size,
        n_live_tup
    FROM pg_stat_user_tables
    WHERE pg_total_relation_size(relid) > 1073741824  -- > 1GB
)
SELECT
    'Large table - consider partitioning' AS "Recommendation",
    schemaname || '.' || relname AS "Table",
    pg_size_pretty(total_size) AS "Size",
    n_live_tup AS "Rows"
FROM large_tables
UNION ALL
-- Unused indexes wasting space
SELECT
    'Unused index - consider dropping',
    schemaname || '.' || indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)),
    0
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND pg_relation_size(indexrelid) > 10485760  -- > 10MB
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY 1, 3 DESC
LIMIT 20;

-- ============================================================
-- 11. CAPACITY PLANNING METRICS
-- ============================================================
\echo ''
\echo '>> CAPACITY PLANNING METRICS'
\echo ''

WITH db_stats AS (
    SELECT
        pg_database_size(current_database()) AS db_size,
        (SELECT SUM(n_live_tup) FROM pg_stat_user_tables) AS total_rows,
        (SELECT SUM(n_tup_ins) FROM pg_stat_user_tables) AS total_inserts,
        (SELECT SUM(n_tup_del) FROM pg_stat_user_tables) AS total_deletes
)
SELECT
    'Current Database Size' AS "Metric",
    pg_size_pretty(db_size) AS "Value"
FROM db_stats
UNION ALL
SELECT 'Total Rows', total_rows::text FROM db_stats
UNION ALL
SELECT 'Total Inserts (since stats reset)', total_inserts::text FROM db_stats
UNION ALL
SELECT 'Total Deletes (since stats reset)', total_deletes::text FROM db_stats
UNION ALL
SELECT 'Net Row Growth', (total_inserts - total_deletes)::text FROM db_stats
UNION ALL
SELECT
    'Average Row Size',
    pg_size_pretty((db_size / NULLIF(total_rows, 0))::bigint)
FROM db_stats;

\echo ''
\echo '============================================================'
\echo 'Table Size Report Complete'
\echo '============================================================'
