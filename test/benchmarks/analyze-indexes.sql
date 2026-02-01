-- Database Index Analysis for JoonaPay USDC Wallet
-- Purpose: Analyze existing indexes and identify missing or unused indexes

-- ============================================
-- 1. INDEX USAGE STATISTICS
-- ============================================

-- Check which indexes are actually being used
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
        WHEN idx_scan < 100 THEN 'RARELY USED - Review necessity'
        WHEN idx_scan < 10000 THEN 'MODERATELY USED'
        ELSE 'FREQUENTLY USED - Keep and monitor'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- ============================================
-- 2. MISSING INDEX RECOMMENDATIONS
-- ============================================

-- Find tables with sequential scans that might benefit from indexes
SELECT
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as rows_read_sequentially,
    idx_scan as index_scans,
    ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) as seq_scan_percentage,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    CASE
        WHEN seq_scan > idx_scan AND seq_scan > 1000
        THEN 'HIGH PRIORITY - Add indexes for frequent queries'
        WHEN seq_scan > idx_scan AND seq_scan > 100
        THEN 'MEDIUM PRIORITY - Review query patterns'
        ELSE 'LOW PRIORITY'
    END as recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- ============================================
-- 3. TRANSACTIONS TABLE INDEX ANALYSIS
-- ============================================

-- Check indexes on transactions table
SELECT
    i.relname as index_name,
    a.attname as column_name,
    am.amname as index_type,
    pg_size_pretty(pg_relation_size(i.oid)) as index_size,
    idx.idx_scan as scans,
    idx.idx_tup_read as tuples_read
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_am am ON i.relam = am.oid
LEFT JOIN pg_stat_user_indexes idx ON idx.indexrelid = i.oid
WHERE t.relname = 'transactions'
ORDER BY i.relname, a.attnum;

-- Recommended indexes for transactions table
SELECT '-- RECOMMENDED INDEXES FOR TRANSACTIONS TABLE' as analysis;

-- Check if composite index exists for wallet + date queries
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'transactions'
            AND indexdef LIKE '%walletId%createdAt%'
        )
        THEN '✓ Composite index on (walletId, createdAt) EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_transactions_wallet_date ON transactions(walletId, createdAt DESC);'
    END as wallet_date_index;

-- Check index on status column
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'transactions'
            AND indexdef LIKE '%status%'
        )
        THEN '✓ Index on status EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_transactions_status ON transactions(status);'
    END as status_index;

-- Check index on type column
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'transactions'
            AND indexdef LIKE '%type%'
        )
        THEN '✓ Index on type EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_transactions_type ON transactions(type);'
    END as type_index;

-- Check index on provider reference
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'transactions'
            AND indexdef LIKE '%yellowCardRef%'
        )
        THEN '✓ Index on yellowCardRef EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_transactions_provider_ref ON transactions(yellowCardRef);'
    END as provider_ref_index;

-- ============================================
-- 4. USERS TABLE INDEX ANALYSIS
-- ============================================

-- Check indexes on users table
SELECT
    i.relname as index_name,
    a.attname as column_name,
    am.amname as index_type,
    pg_size_pretty(pg_relation_size(i.oid)) as index_size,
    idx.idx_scan as scans,
    idx.idx_tup_read as tuples_read
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_am am ON i.relam = am.oid
LEFT JOIN pg_stat_user_indexes idx ON idx.indexrelid = i.oid
WHERE t.relname = 'users'
ORDER BY i.relname, a.attnum;

-- Recommended indexes for users table
SELECT '-- RECOMMENDED INDEXES FOR USERS TABLE' as analysis;

-- Check unique index on phone
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'users'
            AND indexdef LIKE '%UNIQUE%phone%'
        )
        THEN '✓ UNIQUE index on phone EXISTS'
        ELSE '✗ MISSING: CREATE UNIQUE INDEX idx_users_phone ON users(phone);'
    END as phone_index;

-- Check index on username
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'users'
            AND indexdef LIKE '%username%'
        )
        THEN '✓ Index on username EXISTS'
        ELSE '✗ MISSING: CREATE UNIQUE INDEX idx_users_username ON users(LOWER(username));'
    END as username_index;

-- Check GIN index for username search
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'users'
            AND indexdef LIKE '%gin_trgm_ops%'
        )
        THEN '✓ GIN index for username search EXISTS'
        ELSE '✗ RECOMMENDED: CREATE INDEX idx_users_username_gin ON users USING GIN(username gin_trgm_ops);'
    END as username_gin_index;

-- ============================================
-- 5. WALLETS TABLE INDEX ANALYSIS
-- ============================================

-- Check indexes on wallets table
SELECT
    i.relname as index_name,
    a.attname as column_name,
    am.amname as index_type,
    pg_size_pretty(pg_relation_size(i.oid)) as index_size,
    idx.idx_scan as scans,
    idx.idx_tup_read as tuples_read
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_am am ON i.relam = am.oid
LEFT JOIN pg_stat_user_indexes idx ON idx.indexrelid = i.oid
WHERE t.relname = 'wallets'
ORDER BY i.relname, a.attnum;

-- Recommended indexes for wallets table
SELECT '-- RECOMMENDED INDEXES FOR WALLETS TABLE' as analysis;

-- Check unique index on userId
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'wallets'
            AND indexdef LIKE '%UNIQUE%userId%'
        )
        THEN '✓ UNIQUE index on userId EXISTS'
        ELSE '✗ MISSING: CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(userId);'
    END as user_id_index;

-- Check index on circleWalletId
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'wallets'
            AND indexdef LIKE '%circleWalletId%'
        )
        THEN '✓ Index on circleWalletId EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_wallets_circle_wallet_id ON wallets(circleWalletId);'
    END as circle_wallet_index;

-- Check index on yellowCardWalletId
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'wallets'
            AND indexdef LIKE '%yellowCardWalletId%'
        )
        THEN '✓ Index on yellowCardWalletId EXISTS'
        ELSE '✗ MISSING: CREATE INDEX idx_wallets_yellow_card_wallet_id ON wallets(yellowCardWalletId);'
    END as yellow_card_wallet_index;

-- ============================================
-- 6. BLOATED INDEXES (Need Rebuilding)
-- ============================================

SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    ROUND(100 * pg_relation_size(indexrelid) / NULLIF(pg_relation_size(tablename::regclass), 0), 2) as index_to_table_ratio,
    CASE
        WHEN pg_relation_size(indexrelid) > pg_relation_size(tablename::regclass)
        THEN 'BLOATED - Consider REINDEX'
        ELSE 'OK'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- 7. DUPLICATE INDEXES
-- ============================================

-- Find indexes that might be duplicates
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx.indexrelid))) as total_size,
    string_agg(idx.indexrelname, ', ') as duplicate_indexes,
    idx.indrelid::regclass as table_name
FROM pg_index idx
JOIN pg_stat_user_indexes stat ON idx.indexrelid = stat.indexrelid
WHERE idx.indisunique = false
GROUP BY idx.indrelid, idx.indkey
HAVING COUNT(*) > 1;

-- ============================================
-- 8. CACHE HIT RATIO
-- ============================================

-- Check if indexes are being served from cache
SELECT
    'index hit rate' as metric,
    ROUND(
        100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0),
        2
    ) as percentage,
    CASE
        WHEN sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) > 0.99
        THEN 'EXCELLENT'
        WHEN sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) > 0.95
        THEN 'GOOD'
        WHEN sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) > 0.90
        THEN 'ACCEPTABLE'
        ELSE 'POOR - Increase shared_buffers'
    END as status
FROM pg_statio_user_indexes;

-- ============================================
-- 9. QUERY PLAN ANALYSIS
-- ============================================

-- This section provides example queries to run with EXPLAIN ANALYZE

SELECT '-- EXAMPLE: Analyze transaction query performance' as instruction;
SELECT 'EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM transactions WHERE walletId = ''your-wallet-id'' ORDER BY createdAt DESC LIMIT 20;' as example_query;

SELECT '-- EXAMPLE: Analyze user search performance' as instruction;
SELECT 'EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM users WHERE username ILIKE ''test%'' LIMIT 10;' as example_query;

-- ============================================
-- 10. SUMMARY AND RECOMMENDATIONS
-- ============================================

SELECT '-- PERFORMANCE SUMMARY' as section;

-- Total database size
SELECT
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value;

-- Total indexes size
SELECT
    'Total Indexes Size' as metric,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as value
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Index to table ratio
SELECT
    'Index to Data Ratio' as metric,
    ROUND(
        100.0 * SUM(pg_relation_size(indexrelid)) /
        NULLIF(SUM(pg_total_relation_size(schemaname||'.'||tablename)), 0),
        2
    )::text || '%' as value
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Total unused indexes
SELECT
    'Unused Indexes' as metric,
    COUNT(*) as count
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public';
