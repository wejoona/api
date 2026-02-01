#!/bin/bash

#
# Database Query Benchmark Runner
#
# Runs all database query benchmarks and generates a comprehensive report
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-joonapay_bench}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Database Query Benchmark Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Database: ${GREEN}${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo -e "Started:  ${GREEN}$(date)${NC}"
echo ""

# Create benchmark database if it doesn't exist
echo -e "${YELLOW}Setting up benchmark database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -c "CREATE DATABASE $DB_NAME"

echo -e "${GREEN}✓ Database ready${NC}\n"

# Export database configuration
export DB_HOST
export DB_PORT
export DB_USERNAME
export DB_PASSWORD
export DB_NAME

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a benchmark
run_benchmark() {
    local name=$1
    local pattern=$2

    echo -e "${BLUE}Running ${name} benchmarks...${NC}"

    if npm run test:benchmark:${pattern} 2>&1 | tee benchmark-${pattern}.log; then
        echo -e "${GREEN}✓ ${name} benchmarks completed${NC}\n"
        return 0
    else
        echo -e "${RED}✗ ${name} benchmarks failed${NC}\n"
        return 1
    fi
}

# Run all benchmarks
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Running Benchmarks${NC}"
echo -e "${BLUE}================================${NC}\n"

# Transaction benchmarks
if run_benchmark "Transaction" "transactions"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# User benchmarks
if run_benchmark "User" "users"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Wallet benchmarks
if run_benchmark "Wallet" "wallets"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Generate summary report
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Benchmark Summary${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "Completed: ${GREEN}$(date)${NC}"
echo -e "Total benchmark suites: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}\n"

# Extract slow queries from logs
echo -e "${BLUE}Slow Queries Summary${NC}"
echo -e "${BLUE}================================${NC}\n"

if grep -h "SLOW QUERIES DETECTED" benchmark-*.log > /dev/null 2>&1; then
    grep -h -A 100 "SLOW QUERIES DETECTED" benchmark-*.log | grep -v "^--$" || true
else
    echo -e "${GREEN}No slow queries detected!${NC}\n"
fi

# Performance recommendations
echo -e "${BLUE}Performance Recommendations${NC}"
echo -e "${BLUE}================================${NC}\n"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${YELLOW}Some benchmarks failed. Consider:${NC}"
    echo -e "  1. Review slow query recommendations above"
    echo -e "  2. Check database indexes are properly created"
    echo -e "  3. Verify database connection pool settings"
    echo -e "  4. Consider database resource scaling"
    echo -e "  5. Implement caching for frequently accessed data\n"
else
    echo -e "${GREEN}All benchmarks passed! Performance is within acceptable thresholds.${NC}\n"
fi

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
rm -f benchmark-*.log 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}\n"

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
