#!/bin/bash
#
# REINDEX Script for JoonaPay USDC Wallet
# Purpose: Rebuild indexes to eliminate bloat and improve performance
# Schedule: Weekly during maintenance window (recommended: Sunday 04:00 UTC)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/joonapay/db-maintenance}"
LOG_FILE="${LOG_DIR}/reindex-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="/tmp/joonapay-reindex.lock"

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-joonapay}"
DB_USER="${DB_USER:-joonapay}"

# Thresholds
INDEX_BLOAT_THRESHOLD="${INDEX_BLOAT_THRESHOLD:-30}"  # Percentage
CONCURRENT_REINDEX="${CONCURRENT_REINDEX:-true}"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$1"; }
log_warn() { log "WARN" "$1"; }
log_error() { log "ERROR" "$1"; }

cleanup() {
    rm -f "$LOCK_FILE"
    log_info "Cleanup completed"
}

trap cleanup EXIT

# Check for existing lock
if [ -f "$LOCK_FILE" ]; then
    pid=$(cat "$LOCK_FILE" 2>/dev/null)
    if kill -0 "$pid" 2>/dev/null; then
        log_error "Another reindex process is running (PID: $pid). Exiting."
        exit 1
    else
        log_warn "Stale lock file found. Removing."
        rm -f "$LOCK_FILE"
    fi
fi

echo $$ > "$LOCK_FILE"

log_info "=========================================="
log_info "Starting REINDEX for JoonaPay DB"
log_info "=========================================="
log_info "Host: $DB_HOST:$DB_PORT"
log_info "Database: $DB_NAME"
log_info "Concurrent: $CONCURRENT_REINDEX"

# Verify database connection
if ! PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to database"
    exit 1
fi

log_info "Database connection verified"

# Check PostgreSQL version for CONCURRENTLY support
PG_VERSION=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SHOW server_version_num")
log_info "PostgreSQL version: $PG_VERSION"

# REINDEX CONCURRENTLY requires PostgreSQL 12+
if [ "$PG_VERSION" -lt 120000 ]; then
    log_warn "PostgreSQL < 12 detected. REINDEX CONCURRENTLY not available."
    CONCURRENT_REINDEX="false"
fi

# Get bloated indexes
log_info "Identifying bloated indexes..."

BLOATED_INDEXES=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
WITH index_stats AS (
    SELECT
        schemaname,
        tablename,
        indexrelname,
        pg_relation_size(indexrelid) AS index_size,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
    FROM pg_stat_user_indexes
    JOIN pg_index USING (indexrelid)
    WHERE NOT indisunique
),
table_stats AS (
    SELECT
        schemaname,
        relname,
        pg_relation_size(relid) AS table_size,
        n_live_tup
    FROM pg_stat_user_tables
)
SELECT
    i.schemaname || '.' || i.indexrelname
FROM index_stats i
JOIN table_stats t ON i.schemaname = t.schemaname AND i.tablename = t.relname
WHERE t.n_live_tup > 1000
  AND i.index_size > 1048576  -- > 1MB
  AND (i.index_size::float / NULLIF(t.table_size, 0) * 100) > $INDEX_BLOAT_THRESHOLD
ORDER BY i.index_size DESC;
")

# Critical indexes that should always be optimized
CRITICAL_INDEXES=(
    "public.idx_transactions_user_id"
    "public.idx_transactions_created_at"
    "public.idx_transactions_status"
    "public.idx_transactions_wallet_id"
    "public.idx_wallets_user_id"
    "public.idx_audit_logs_entity_id"
    "public.idx_audit_logs_created_at"
    "public.idx_sessions_user_id"
    "public.idx_sessions_expires_at"
    "public.idx_beneficiaries_user_id"
    "public.idx_payment_links_merchant_id"
    "public.idx_payment_links_status"
)

reindex_index() {
    local index_name="$1"
    local start_time=$(date +%s)

    log_info "Reindexing: $index_name"

    if [ "$CONCURRENT_REINDEX" = "true" ]; then
        if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX INDEX CONCURRENTLY $index_name" >> "$LOG_FILE" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            log_info "  Completed (CONCURRENTLY) in ${duration}s"
            return 0
        else
            log_warn "  CONCURRENTLY failed, trying standard REINDEX..."
        fi
    fi

    # Fall back to standard REINDEX
    if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX INDEX $index_name" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_info "  Completed in ${duration}s"
        return 0
    else
        log_error "  Failed to reindex $index_name"
        return 1
    fi
}

# Process critical indexes first
log_info "Processing critical indexes..."

for index in "${CRITICAL_INDEXES[@]}"; do
    # Check if index exists
    exists=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT 1 FROM pg_indexes
        WHERE schemaname || '.' || indexname = '$index'
    ")

    if [ "$exists" = "1" ]; then
        reindex_index "$index"
    else
        log_warn "Index $index does not exist, skipping"
    fi
done

# Process bloated indexes
if [ -n "$BLOATED_INDEXES" ]; then
    log_info "Processing bloated indexes..."

    echo "$BLOATED_INDEXES" | while read index; do
        # Skip if already processed
        skip=false
        for critical in "${CRITICAL_INDEXES[@]}"; do
            if [ "$index" = "$critical" ]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = "false" ]; then
            reindex_index "$index"
        fi
    done
else
    log_info "No additional bloated indexes found"
fi

# Reindex system catalogs (if superuser)
IS_SUPERUSER=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT usesuper FROM pg_user WHERE usename = current_user")

if [ "$IS_SUPERUSER" = "t" ]; then
    log_info "Reindexing system catalogs..."
    PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX SYSTEM $DB_NAME" >> "$LOG_FILE" 2>&1 || log_warn "System reindex skipped (may require exclusive access)"
fi

# Generate index health report
log_info "=========================================="
log_info "Index Health Report"
log_info "=========================================="

PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    schemaname || '.' || indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW USAGE'
        ELSE 'ACTIVE'
    END AS status
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > 1048576
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 25;
" | tee -a "$LOG_FILE"

# Check for unused indexes
log_info "=========================================="
log_info "Unused Indexes (candidates for removal)"
log_info "=========================================="

PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    schemaname || '.' || indexrelname AS index_name,
    schemaname || '.' || relname AS table_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    idx_scan AS scans_since_stats_reset
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND pg_relation_size(indexrelid) > 1048576
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 15;
" | tee -a "$LOG_FILE"

log_info "=========================================="
log_info "REINDEX completed successfully"
log_info "Log file: $LOG_FILE"
log_info "=========================================="

exit 0
