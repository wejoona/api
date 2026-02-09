-- ============================================================
-- BLOAT CHECK Report for JoonaPay USDC Wallet
-- Purpose: Identify table and index bloat for maintenance planning
-- Usage: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f bloat-check.sql
-- ============================================================

\echo '============================================================'
\echo 'JoonaPay Database Bloat Analysis Report'
\echo 'Generated:' :DBNAME 'at' `date`
\echo '============================================================'
\echo ''

-- Set output formatting
\pset format aligned
\pset border 2
\pset null '(null)'

-- ============================================================
-- 1. TABLE BLOAT ANALYSIS
-- ============================================================
\echo ''
\echo '>> TABLE BLOAT ANALYSIS'
\echo '   Shows tables with significant dead tuple accumulation'
\echo ''

WITH table_bloat AS (
    SELECT
        schemaname,
        relname AS table_name,
        n_live_tup,
        n_dead_tup,
        ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) AS dead_tuple_ratio,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        pg_relation_size(relid) AS table_size_bytes,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        vacuum_count,
        autovacuum_count
    FROM pg_stat_user_tables
    WHERE n_live_tup > 100
)
SELECT
    schemaname || '.' || table_name AS "Table",
    n_live_tup AS "Live Tuples",
    n_dead_tup AS "Dead Tuples",
    dead_tuple_ratio || '%' AS "Dead %",
    table_size AS "Size",
    COALESCE(TO_CHAR(last_vacuum, 'YYYY-MM-DD HH24:MI'), 'Never') AS "Last Vacuum",
    COALESCE(TO_CHAR(last_autovacuum, 'YYYY-MM-DD HH24:MI'), 'Never') AS "Last AutoVacuum",
    CASE
        WHEN dead_tuple_ratio > 20 THEN 'CRITICAL - Immediate vacuum needed'
        WHEN dead_tuple_ratio > 10 THEN 'WARNING - Schedule vacuum'
        WHEN dead_tuple_ratio > 5 THEN 'MODERATE - Monitor'
        ELSE 'OK'
    END AS "Status"
FROM table_bloat
WHERE n_dead_tup > 0 OR dead_tuple_ratio > 5
ORDER BY dead_tuple_ratio DESC NULLS LAST, table_size_bytes DESC
LIMIT 30;

-- ============================================================
-- 2. INDEX BLOAT ESTIMATION
-- ============================================================
\echo ''
\echo '>> INDEX BLOAT ESTIMATION'
\echo '   Estimates index bloat based on relation sizes'
\echo ''

WITH index_bloat_estimate AS (
    SELECT
        nspname AS schema_name,
        tblname AS table_name,
        idxname AS index_name,
        bs * (relpages)::bigint AS real_size,
        bs * (
            CEIL(reltuples / (
                CEIL((bs - 24.0 - (CASE WHEN version() ~ 'mingw32' OR version() ~ '64-bit|x86_64|ppc64|ia64|amd64' THEN 8 ELSE 4 END)) / (2.0 + (CASE WHEN NOT indkey::text ~ '\s0\s' THEN 4 ELSE 0 END) + COALESCE(nulldatawidth, 0.0) + COALESCE(keydatawidth, 0.0)))
            )))::bigint AS estimated_size,
        CASE WHEN relpages > 0 THEN
            ROUND(100.0 * (
                relpages - CEIL(reltuples / (
                    CEIL((bs - 24.0 - (CASE WHEN version() ~ 'mingw32' OR version() ~ '64-bit|x86_64|ppc64|ia64|amd64' THEN 8 ELSE 4 END)) / (2.0 + (CASE WHEN NOT indkey::text ~ '\s0\s' THEN 4 ELSE 0 END) + COALESCE(nulldatawidth, 0.0) + COALESCE(keydatawidth, 0.0)))
                ))
            ) / relpages::numeric, 2)
        ELSE 0 END AS bloat_pct,
        fillfactor
    FROM (
        SELECT
            COALESCE(c2.relname, '?') AS tblname,
            c.relname AS idxname,
            n.nspname,
            c.relpages,
            c.reltuples,
            current_setting('block_size')::integer AS bs,
            i.indkey,
            COALESCE(i.indnatts, 0) AS indnatts,
            COALESCE(pg_catalog.array_length(string_to_array(textin(int2vectorout(i.indkey)), ' '), 1), 0) AS nkey,
            (CASE WHEN COALESCE(s.null_frac, 0) = 0 THEN 2 ELSE 2 + (((4 * COALESCE(s.n_distinct, 0))::bigint) / (COALESCE(s.n_distinct, 1))::bigint)::integer END)::numeric AS nulldatawidth,
            COALESCE(s.avg_width, 0)::numeric AS keydatawidth,
            COALESCE((
                SELECT (regexp_matches(reloptions::text, E'fillfactor=(\\d+)'))[1]
                FROM pg_class WHERE oid = c.oid
            )::smallint, 90) AS fillfactor
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_index i ON i.indexrelid = c.oid
        LEFT JOIN pg_class c2 ON c2.oid = i.indrelid
        LEFT JOIN pg_stats s ON s.schemaname = n.nspname AND s.tablename = c2.relname AND s.attname = pg_catalog.pg_get_indexdef(c.oid, 1, TRUE)
        WHERE c.relkind = 'i'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND c.relpages > 0
    ) AS idx_data
    WHERE relpages > 10
)
SELECT
    schema_name || '.' || index_name AS "Index",
    table_name AS "Table",
    pg_size_pretty(real_size) AS "Current Size",
    pg_size_pretty(estimated_size) AS "Est. Optimal",
    pg_size_pretty(real_size - estimated_size) AS "Bloat Size",
    bloat_pct || '%' AS "Bloat %",
    CASE
        WHEN bloat_pct > 50 THEN 'CRITICAL - Reindex immediately'
        WHEN bloat_pct > 30 THEN 'HIGH - Schedule reindex'
        WHEN bloat_pct > 20 THEN 'MODERATE - Monitor'
        ELSE 'OK'
    END AS "Status"
FROM index_bloat_estimate
WHERE real_size > 1048576  -- > 1MB
  AND bloat_pct > 10
ORDER BY real_size - estimated_size DESC
LIMIT 25;

-- ============================================================
-- 3. TABLES REQUIRING VACUUM
-- ============================================================
\echo ''
\echo '>> TABLES REQUIRING IMMEDIATE VACUUM'
\echo '   Based on dead tuple threshold and last vacuum time'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    n_dead_tup AS "Dead Tuples",
    ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) || '%' AS "Dead %",
    pg_size_pretty(pg_relation_size(relid)) AS "Size",
    COALESCE(
        EXTRACT(EPOCH FROM (NOW() - last_vacuum)) / 3600,
        EXTRACT(EPOCH FROM (NOW() - last_autovacuum)) / 3600,
        999
    )::integer AS "Hours Since Vacuum",
    'VACUUM ANALYZE ' || schemaname || '.' || relname || ';' AS "Suggested Command"
FROM pg_stat_user_tables
WHERE (
    n_dead_tup > 10000
    OR (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) * 100) > 10
    OR (last_vacuum IS NULL AND last_autovacuum IS NULL AND n_dead_tup > 1000)
    OR (GREATEST(last_vacuum, last_autovacuum) < NOW() - INTERVAL '7 days' AND n_dead_tup > 5000)
)
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ============================================================
-- 4. AUTOVACUUM EFFECTIVENESS
-- ============================================================
\echo ''
\echo '>> AUTOVACUUM EFFECTIVENESS'
\echo '   Tables that may need autovacuum tuning'
\echo ''

SELECT
    schemaname || '.' || relname AS "Table",
    n_live_tup AS "Live Tuples",
    n_dead_tup AS "Dead Tuples",
    vacuum_count AS "Manual Vacuums",
    autovacuum_count AS "Auto Vacuums",
    CASE
        WHEN autovacuum_count = 0 AND n_dead_tup > 10000 THEN 'Never autovacuumed - check settings'
        WHEN n_dead_tup > n_live_tup * 0.2 THEN 'High dead ratio - increase autovacuum frequency'
        WHEN autovacuum_count > vacuum_count * 10 THEN 'Autovacuum doing most work - OK'
        ELSE 'Normal'
    END AS "Assessment"
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ============================================================
-- 5. BLOAT RECOVERY RECOMMENDATIONS
-- ============================================================
\echo ''
\echo '>> BLOAT RECOVERY RECOMMENDATIONS'
\echo ''

WITH bloat_summary AS (
    SELECT
        SUM(n_dead_tup) AS total_dead_tuples,
        SUM(pg_relation_size(relid)) FILTER (WHERE n_dead_tup > n_live_tup * 0.1) AS tables_with_bloat_size,
        COUNT(*) FILTER (WHERE n_dead_tup > 10000) AS critical_tables,
        COUNT(*) FILTER (WHERE last_vacuum IS NULL AND last_autovacuum IS NULL) AS never_vacuumed
    FROM pg_stat_user_tables
)
SELECT
    'Total dead tuples across all tables: ' || COALESCE(total_dead_tuples::text, '0') AS "Metric"
FROM bloat_summary
UNION ALL
SELECT
    'Tables with >10% bloat (total size): ' || COALESCE(pg_size_pretty(tables_with_bloat_size), '0 bytes')
FROM bloat_summary
UNION ALL
SELECT
    'Critical tables (>10K dead tuples): ' || COALESCE(critical_tables::text, '0')
FROM bloat_summary
UNION ALL
SELECT
    'Tables never vacuumed: ' || COALESCE(never_vacuumed::text, '0')
FROM bloat_summary;

\echo ''
\echo '>> MAINTENANCE PRIORITY QUEUE'
\echo ''

SELECT
    ROW_NUMBER() OVER (ORDER BY
        CASE
            WHEN n_dead_tup > n_live_tup THEN 1
            WHEN (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) * 100) > 20 THEN 2
            WHEN n_dead_tup > 100000 THEN 3
            ELSE 4
        END,
        n_dead_tup DESC
    ) AS "Priority",
    schemaname || '.' || relname AS "Table",
    CASE
        WHEN n_dead_tup > n_live_tup THEN 'VACUUM FULL (offline)'
        WHEN (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) * 100) > 20 THEN 'VACUUM ANALYZE'
        ELSE 'VACUUM'
    END AS "Action",
    pg_size_pretty(pg_relation_size(relid)) AS "Current Size",
    n_dead_tup AS "Dead Tuples"
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY 1
LIMIT 15;

\echo ''
\echo '============================================================'
\echo 'Bloat Check Complete'
\echo '============================================================'
