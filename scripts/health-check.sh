#!/bin/bash
# =============================================================================
# JoonaPay USDC Wallet - Health Check Script
# =============================================================================
# Usage:
#   ./scripts/health-check.sh [url] [options]
#
# Arguments:
#   url             Health check URL (default: http://localhost:3000/api/v1/health)
#
# Options:
#   --retries N     Number of retries (default: 5)
#   --interval N    Seconds between retries (default: 10)
#   --timeout N     Request timeout in seconds (default: 10)
#   --verbose       Show detailed output
#
# Examples:
#   ./scripts/health-check.sh
#   ./scripts/health-check.sh https://api.joonapay.com/api/v1/health
#   ./scripts/health-check.sh --retries 10 --interval 5
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
HEALTH_URL="${1:-http://localhost:3000/api/v1/health}"
MAX_RETRIES=5
RETRY_INTERVAL=10
TIMEOUT=10
VERBOSE=false

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --interval)
            RETRY_INTERVAL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

log() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

error() {
    echo -e "${RED}[HEALTH]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[HEALTH]${NC} $1"
}

info() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# =============================================================================
# Health Check Function
# =============================================================================

check_health() {
    local url="$1"
    local response
    local http_code
    local body

    info "Checking: ${url}"

    # Make request and capture both body and status code
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo -e "\n000")

    # Split response into body and status code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    info "HTTP Status: ${http_code}"
    info "Response: ${body}"

    if [ "$http_code" = "200" ]; then
        # Parse JSON response to check individual health components
        if command -v jq &> /dev/null; then
            local status
            status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")

            if [ "$status" = "ok" ] || [ "$status" = "healthy" ]; then
                return 0
            else
                warn "Health endpoint returned status: ${status}"

                # Check individual components
                local db_status
                local redis_status
                db_status=$(echo "$body" | jq -r '.info.database.status // "unknown"' 2>/dev/null || echo "unknown")
                redis_status=$(echo "$body" | jq -r '.info.redis.status // "unknown"' 2>/dev/null || echo "unknown")

                info "Database status: ${db_status}"
                info "Redis status: ${redis_status}"

                # Consider healthy if HTTP 200, even if some components report issues
                if [ "$db_status" = "up" ]; then
                    return 0
                fi
            fi
        else
            # Without jq, just check for HTTP 200
            return 0
        fi
    fi

    return 1
}

# =============================================================================
# Extended Health Checks
# =============================================================================

check_database() {
    local base_url="${HEALTH_URL%/health}"
    local db_health_url="${base_url}/health/db"

    info "Checking database health..."

    if curl -s --max-time "$TIMEOUT" "$db_health_url" | grep -q '"status":"up"' 2>/dev/null; then
        return 0
    fi

    return 1
}

check_redis() {
    local base_url="${HEALTH_URL%/health}"
    local redis_health_url="${base_url}/health/redis"

    info "Checking Redis health..."

    if curl -s --max-time "$TIMEOUT" "$redis_health_url" | grep -q '"status":"up"' 2>/dev/null; then
        return 0
    fi

    return 1
}

check_api_response_time() {
    local url="$1"
    local max_time=2  # Max acceptable response time in seconds

    info "Checking API response time..."

    local start_time
    local end_time
    local duration

    start_time=$(date +%s.%N)
    curl -s --max-time "$TIMEOUT" "$url" > /dev/null 2>&1
    end_time=$(date +%s.%N)

    duration=$(echo "$end_time - $start_time" | bc)

    info "Response time: ${duration}s"

    if (( $(echo "$duration < $max_time" | bc -l) )); then
        return 0
    else
        warn "Response time (${duration}s) exceeds threshold (${max_time}s)"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

log "Starting health check for: ${HEALTH_URL}"
log "Configuration: retries=${MAX_RETRIES}, interval=${RETRY_INTERVAL}s, timeout=${TIMEOUT}s"

attempt=0
success=false

while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    log "Attempt ${attempt}/${MAX_RETRIES}..."

    if check_health "$HEALTH_URL"; then
        success=true
        break
    fi

    if [ $attempt -lt $MAX_RETRIES ]; then
        warn "Health check failed, retrying in ${RETRY_INTERVAL}s..."
        sleep "$RETRY_INTERVAL"
    fi
done

if [ "$success" = true ]; then
    log "Health check passed!"

    # Run extended checks if verbose
    if [ "$VERBOSE" = true ]; then
        echo ""
        log "Running extended health checks..."

        if check_api_response_time "$HEALTH_URL"; then
            log "Response time: OK"
        else
            warn "Response time: SLOW"
        fi

        echo ""
    fi

    # Print summary
    echo ""
    echo "=============================================="
    echo "  HEALTH CHECK SUMMARY"
    echo "=============================================="
    echo "  URL:       ${HEALTH_URL}"
    echo "  Status:    HEALTHY"
    echo "  Attempts:  ${attempt}/${MAX_RETRIES}"
    echo "=============================================="
    echo ""

    exit 0
else
    error "Health check failed after ${MAX_RETRIES} attempts"

    # Print failure summary
    echo ""
    echo "=============================================="
    echo "  HEALTH CHECK SUMMARY"
    echo "=============================================="
    echo "  URL:       ${HEALTH_URL}"
    echo "  Status:    UNHEALTHY"
    echo "  Attempts:  ${attempt}/${MAX_RETRIES}"
    echo "=============================================="
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if the service is running: docker ps"
    echo "  2. Check service logs: docker logs usdc_wallet_api"
    echo "  3. Verify database connection"
    echo "  4. Verify Redis connection"
    echo "  5. Check network/firewall rules"
    echo ""

    exit 1
fi
