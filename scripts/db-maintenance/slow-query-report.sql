-- ============================================================
-- SLOW QUERY Report for JoonaPay USDC Wallet
-- Purpose: Identify and analyze slow queries for optimization
-- Requires: pg_stat_statements extension
-- Usage: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f slow-query-report.sql
-- ============================================================

\echo '============================================================'
\echo 'JoonaPay Slow Query Analysis Report'
\echo 'Generated:' :DBNAME
\echo '============================================================'
\echo ''

-- Set output formatting
\pset format aligned
\pset border 2
\pset null '(null)'
\pset tuples_only off

-- Check if pg_stat_statements is available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE NOTICE 'pg_stat_statements extension not installed. Install with: CREATE EXTENSION pg_stat_statements;';
    END IF;
END $$;

-- ============================================================
-- 1. TOP SLOW QUERIES BY TOTAL TIME
-- ============================================================
\echo ''
\echo '>> TOP 20 QUERIES BY TOTAL EXECUTION TIME'
\echo '   These queries consume the most database resources'
\echo ''

SELECT
    ROW_NUMBER() OVER (ORDER BY total_exec_time DESC) AS "Rank",
    SUBSTRING(query, 1, 80) || CASE WHEN LENGTH(query) > 80 THEN '...' ELSE '' END AS "Query (truncated)",
    calls AS "Calls",
    ROUND(total_exec_time::numeric / 1000, 2) AS "Total Time (s)",
    ROUND((mean_exec_time)::numeric, 2) AS "Avg Time (ms)",
    ROUND((min_exec_time)::numeric, 2) AS "Min (ms)",
    ROUND((max_exec_time)::numeric, 2) AS "Max (ms)",
    rows AS "Rows Returned",
    ROUND((100.0 * total_exec_time / NULLIF(SUM(total_exec_time) OVER (), 0))::numeric, 2) || '%' AS "% of Total"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query NOT LIKE '%pg_stat%'
  AND query NOT LIKE 'COMMIT%'
  AND query NOT LIKE 'BEGIN%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- ============================================================
-- 2. QUERIES WITH HIGHEST AVERAGE TIME
-- ============================================================
\echo ''
\echo '>> TOP 20 QUERIES BY AVERAGE EXECUTION TIME'
\echo '   These queries are individually slow'
\echo ''

SELECT
    ROW_NUMBER() OVER (ORDER BY mean_exec_time DESC) AS "Rank",
    SUBSTRING(query, 1, 80) || CASE WHEN LENGTH(query) > 80 THEN '...' ELSE '' END AS "Query (truncated)",
    calls AS "Calls",
    ROUND((mean_exec_time)::numeric, 2) AS "Avg Time (ms)",
    ROUND((stddev_exec_time)::numeric, 2) AS "Std Dev (ms)",
    ROUND((min_exec_time)::numeric, 2) AS "Min (ms)",
    ROUND((max_exec_time)::numeric, 2) AS "Max (ms)",
    rows AS "Total Rows",
    CASE
        WHEN mean_exec_time > 1000 THEN 'CRITICAL'
        WHEN mean_exec_time > 500 THEN 'HIGH'
        WHEN mean_exec_time > 100 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS "Priority"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls >= 10  -- At least 10 calls for statistical significance
  AND query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================================
-- 3. QUERIES WITH HIGH VARIANCE (INCONSISTENT PERFORMANCE)
-- ============================================================
\echo ''
\echo '>> QUERIES WITH HIGH VARIANCE'
\echo '   Inconsistent performance may indicate lock contention or missing indexes'
\echo ''

SELECT
    SUBSTRING(query, 1, 80) || CASE WHEN LENGTH(query) > 80 THEN '...' ELSE '' END AS "Query (truncated)",
    calls AS "Calls",
    ROUND((mean_exec_time)::numeric, 2) AS "Avg (ms)",
    ROUND((stddev_exec_time)::numeric, 2) AS "Std Dev (ms)",
    ROUND((stddev_exec_time / NULLIF(mean_exec_time, 0) * 100)::numeric, 2) || '%' AS "CV %",
    ROUND((min_exec_time)::numeric, 2) AS "Min (ms)",
    ROUND((max_exec_time)::numeric, 2) AS "Max (ms)",
    ROUND((max_exec_time - min_exec_time)::numeric, 2) AS "Range (ms)"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls >= 100
  AND stddev_exec_time > mean_exec_time * 0.5  -- CV > 50%
  AND query NOT LIKE '%pg_stat%'
ORDER BY (stddev_exec_time / NULLIF(mean_exec_time, 0)) DESC
LIMIT 15;

-- ============================================================
-- 4. QUERIES WITH HIGH ROW COUNTS
-- ============================================================
\echo ''
\echo '>> QUERIES RETURNING MANY ROWS'
\echo '   May indicate missing LIMIT or pagination issues'
\echo ''

SELECT
    SUBSTRING(query, 1, 80) || CASE WHEN LENGTH(query) > 80 THEN '...' ELSE '' END AS "Query (truncated)",
    calls AS "Calls",
    rows AS "Total Rows",
    ROUND(rows::numeric / NULLIF(calls, 0), 0) AS "Avg Rows/Call",
    ROUND((mean_exec_time)::numeric, 2) AS "Avg Time (ms)",
    CASE
        WHEN rows / NULLIF(calls, 0) > 10000 THEN 'CRITICAL - Add pagination'
        WHEN rows / NULLIF(calls, 0) > 1000 THEN 'HIGH - Review query'
        ELSE 'REVIEW'
    END AS "Recommendation"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls >= 10
  AND rows / NULLIF(calls, 0) > 100
  AND query NOT LIKE '%pg_stat%'
  AND query ~* '^SELECT'
ORDER BY rows / NULLIF(calls, 0) DESC
LIMIT 15;

-- ============================================================
-- 5. SEQUENTIAL SCAN HEAVY QUERIES
-- ============================================================
\echo ''
\echo '>> TABLES WITH HIGH SEQUENTIAL SCAN RATIOS'
\echo '   May indicate missing indexes'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    seq_scan AS "Seq Scans",
    idx_scan AS "Index Scans",
    CASE
        WHEN (seq_scan + idx_scan) > 0 THEN
            ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2) || '%'
        ELSE 'N/A'
    END AS "Seq Scan %",
    seq_tup_read AS "Seq Tuples Read",
    idx_tup_fetch AS "Idx Tuples Fetched",
    n_live_tup AS "Live Tuples",
    pg_size_pretty(pg_relation_size(relid)) AS "Table Size",
    CASE
        WHEN seq_scan > idx_scan * 10 AND n_live_tup > 10000 THEN 'ADD INDEX'
        WHEN seq_scan > idx_scan * 5 AND n_live_tup > 5000 THEN 'REVIEW'
        ELSE 'OK'
    END AS "Recommendation"
FROM pg_stat_user_tables
WHERE (seq_scan + idx_scan) > 100
  AND n_live_tup > 1000
ORDER BY seq_scan DESC
LIMIT 20;

-- ============================================================
-- 6. JOONAPAY-SPECIFIC QUERY ANALYSIS
-- ============================================================
\echo ''
\echo '>> JOONAPAY CRITICAL QUERIES ANALYSIS'
\echo '   Performance of business-critical operations'
\echo ''

-- Transaction queries
SELECT
    'Transaction Queries' AS "Category",
    COUNT(*) AS "Query Count",
    ROUND(SUM(total_exec_time)::numeric / 1000, 2) AS "Total Time (s)",
    ROUND(AVG(mean_exec_time)::numeric, 2) AS "Avg Time (ms)",
    SUM(calls) AS "Total Calls"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query ~* 'transactions'

UNION ALL

-- Wallet queries
SELECT
    'Wallet Queries',
    COUNT(*),
    ROUND(SUM(total_exec_time)::numeric / 1000, 2),
    ROUND(AVG(mean_exec_time)::numeric, 2),
    SUM(calls)
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query ~* 'wallets'

UNION ALL

-- User/Auth queries
SELECT
    'User/Auth Queries',
    COUNT(*),
    ROUND(SUM(total_exec_time)::numeric / 1000, 2),
    ROUND(AVG(mean_exec_time)::numeric, 2),
    SUM(calls)
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND (query ~* 'users' OR query ~* 'sessions' OR query ~* 'devices')

UNION ALL

-- Beneficiary queries
SELECT
    'Beneficiary Queries',
    COUNT(*),
    ROUND(SUM(total_exec_time)::numeric / 1000, 2),
    ROUND(AVG(mean_exec_time)::numeric, 2),
    SUM(calls)
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query ~* 'beneficiar'

UNION ALL

-- Payment link queries
SELECT
    'Payment Link Queries',
    COUNT(*),
    ROUND(SUM(total_exec_time)::numeric / 1000, 2),
    ROUND(AVG(mean_exec_time)::numeric, 2),
    SUM(calls)
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query ~* 'payment_links';

-- ============================================================
-- 7. CACHE HIT ANALYSIS
-- ============================================================
\echo ''
\echo '>> BUFFER CACHE HIT RATIOS'
\echo '   Low ratios indicate insufficient shared_buffers'
\echo ''

SELECT
    'Buffer Cache Hit Ratio' AS "Metric",
    ROUND(100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0), 2) || '%' AS "Value",
    CASE
        WHEN 100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) < 90 THEN 'CRITICAL - Increase shared_buffers'
        WHEN 100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) < 95 THEN 'LOW - Consider increasing shared_buffers'
        ELSE 'GOOD'
    END AS "Assessment"
FROM pg_stat_database
WHERE datname = current_database();

-- ============================================================
-- 8. QUERY OPTIMIZATION SUGGESTIONS
-- ============================================================
\echo ''
\echo '>> QUERY OPTIMIZATION SUGGESTIONS'
\echo ''

WITH slow_queries AS (
    SELECT
        query,
        calls,
        mean_exec_time,
        total_exec_time,
        rows
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND mean_exec_time > 100
      AND calls > 10
)
SELECT
    SUBSTRING(query, 1, 60) AS "Query Pattern",
    CASE
        WHEN query ~* 'SELECT.*\*.*FROM' AND NOT query ~* 'COUNT\(\*\)'
            THEN 'Avoid SELECT * - specify columns'
        WHEN query ~* 'NOT IN.*SELECT'
            THEN 'Replace NOT IN with NOT EXISTS or LEFT JOIN'
        WHEN query ~* 'LIKE.*%[^%]' AND query ~* '[^%]%'
            THEN 'Leading wildcards prevent index use'
        WHEN query ~* 'OR' AND NOT query ~* 'IN \('
            THEN 'Consider using IN() instead of multiple ORs'
        WHEN query ~* 'ORDER BY.*LIMIT' AND mean_exec_time > 500
            THEN 'Add index for ORDER BY column'
        WHEN query ~* 'GROUP BY' AND mean_exec_time > 500
            THEN 'Consider materialized view or summary table'
        WHEN rows / NULLIF(calls, 0) > 1000
            THEN 'Add LIMIT clause or pagination'
        ELSE 'Review execution plan with EXPLAIN ANALYZE'
    END AS "Suggestion"
FROM slow_queries
ORDER BY total_exec_time DESC
LIMIT 15;

-- ============================================================
-- 9. EXECUTION TIME DISTRIBUTION
-- ============================================================
\echo ''
\echo '>> QUERY EXECUTION TIME DISTRIBUTION'
\echo ''

SELECT
    CASE
        WHEN mean_exec_time < 1 THEN '< 1ms'
        WHEN mean_exec_time < 10 THEN '1-10ms'
        WHEN mean_exec_time < 100 THEN '10-100ms'
        WHEN mean_exec_time < 500 THEN '100-500ms'
        WHEN mean_exec_time < 1000 THEN '500ms-1s'
        ELSE '> 1s'
    END AS "Execution Time Bucket",
    COUNT(*) AS "Query Count",
    SUM(calls) AS "Total Calls",
    ROUND(SUM(total_exec_time)::numeric / 1000, 2) AS "Total Time (s)"
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY 1
ORDER BY MIN(mean_exec_time);

\echo ''
\echo '============================================================'
\echo 'Slow Query Report Complete'
\echo ''
\echo 'To reset statistics: SELECT pg_stat_statements_reset();'
\echo '============================================================'
