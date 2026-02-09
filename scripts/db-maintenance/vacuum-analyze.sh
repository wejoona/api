#!/bin/bash
#
# VACUUM ANALYZE Script for JoonaPay USDC Wallet
# Purpose: Reclaim storage and update statistics for query optimization
# Schedule: Daily during low-traffic hours (recommended: 03:00 UTC)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/joonapay/db-maintenance}"
LOG_FILE="${LOG_DIR}/vacuum-analyze-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="/tmp/joonapay-vacuum.lock"

# Database connection (use environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-joonapay}"
DB_USER="${DB_USER:-joonapay}"

# Thresholds
VACUUM_THRESHOLD_PERCENT="${VACUUM_THRESHOLD_PERCENT:-10}"
MAX_PARALLEL_WORKERS="${MAX_PARALLEL_WORKERS:-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
        log_error "Another vacuum process is running (PID: $pid). Exiting."
        exit 1
    else
        log_warn "Stale lock file found. Removing."
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"

log_info "=========================================="
log_info "Starting VACUUM ANALYZE for JoonaPay DB"
log_info "=========================================="
log_info "Host: $DB_HOST:$DB_PORT"
log_info "Database: $DB_NAME"

# Check database connectivity
if ! PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to database. Check credentials and connectivity."
    exit 1
fi

log_info "Database connection verified"

# Get tables needing vacuum based on dead tuple ratio
log_info "Identifying tables requiring VACUUM..."

TABLES_NEEDING_VACUUM=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT schemaname || '.' || relname
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
  AND (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) * 100) > $VACUUM_THRESHOLD_PERCENT
ORDER BY n_dead_tup DESC;
")

if [ -z "$TABLES_NEEDING_VACUUM" ]; then
    log_info "No tables exceed the dead tuple threshold ($VACUUM_THRESHOLD_PERCENT%)"
else
    log_info "Tables identified for VACUUM:"
    echo "$TABLES_NEEDING_VACUUM" | while read table; do
        log_info "  - $table"
    done
fi

# Priority tables for JoonaPay (always vacuum these)
PRIORITY_TABLES=(
    "public.transactions"
    "public.wallets"
    "public.users"
    "public.audit_logs"
    "public.beneficiaries"
    "public.sessions"
    "public.devices"
    "public.payment_links"
    "public.exchange_rates"
)

log_info "Processing priority tables..."

for table in "${PRIORITY_TABLES[@]}"; do
    if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT 1 FROM information_schema.tables WHERE table_schema || '.' || table_name = '$table'" | grep -q 1; then
        log_info "VACUUM ANALYZE $table..."
        start_time=$(date +%s)

        if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (ANALYZE, VERBOSE) $table" >> "$LOG_FILE" 2>&1; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            log_info "  Completed in ${duration}s"
        else
            log_error "  Failed to vacuum $table"
        fi
    else
        log_warn "Table $table does not exist, skipping"
    fi
done

# Process additional tables needing vacuum
if [ -n "$TABLES_NEEDING_VACUUM" ]; then
    log_info "Processing additional tables exceeding threshold..."

    echo "$TABLES_NEEDING_VACUUM" | while read table; do
        # Skip if already processed as priority table
        if [[ " ${PRIORITY_TABLES[*]} " =~ " ${table} " ]]; then
            continue
        fi

        log_info "VACUUM ANALYZE $table..."
        start_time=$(date +%s)

        if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (ANALYZE, VERBOSE) $table" >> "$LOG_FILE" 2>&1; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            log_info "  Completed in ${duration}s"
        else
            log_error "  Failed to vacuum $table"
        fi
    done
fi

# Update statistics for all tables (lightweight operation)
log_info "Running ANALYZE on entire database..."
start_time=$(date +%s)

if PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE VERBOSE" >> "$LOG_FILE" 2>&1; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    log_info "Database ANALYZE completed in ${duration}s"
else
    log_error "Database ANALYZE failed"
fi

# Generate summary report
log_info "=========================================="
log_info "VACUUM ANALYZE Summary"
log_info "=========================================="

PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    schemaname || '.' || relname AS table_name,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) AS dead_ratio_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
" | tee -a "$LOG_FILE"

log_info "=========================================="
log_info "VACUUM ANALYZE completed successfully"
log_info "Log file: $LOG_FILE"
log_info "=========================================="

exit 0
