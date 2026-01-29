#!/bin/bash

##############################################################################
# JoonaPay Load Test Runner
# Runs all load tests sequentially and generates summary report
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_FILE="$REPORTS_DIR/summary_${TIMESTAMP}.txt"

# Environment
BASE_URL="${BASE_URL:-https://api-dev.joonapay.com}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         JoonaPay Load Testing Suite                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Base URL: ${BASE_URL}"
echo -e "  Reports: ${REPORTS_DIR}"
echo -e "  Timestamp: ${TIMESTAMP}"
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Track results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

##############################################################################
# Functions
##############################################################################

run_test() {
  local test_name=$1
  local test_file=$2
  local duration=$3

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Running: ${test_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "Estimated duration: ${duration}"
  echo ""

  TESTS_RUN=$((TESTS_RUN + 1))

  # Run test
  if BASE_URL="$BASE_URL" k6 run "$SCRIPT_DIR/$test_file"; then
    echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ ${test_name} FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name")
    return 1
  fi
}

##############################################################################
# Run Tests
##############################################################################

echo -e "${YELLOW}Starting test suite...${NC}"
echo ""

# Test 1: Authentication
run_test "Authentication Load Test" "auth-load-test.js" "~8 minutes" || true

sleep 5

# Test 2: Wallet Operations
run_test "Wallet Load Test" "wallet-load-test.js" "~17 minutes" || true

sleep 5

# Test 3: Transfers
run_test "Transfer Load Test" "transfer-load-test.js" "~15 minutes" || true

sleep 5

# Test 4: KYC
run_test "KYC Load Test" "kyc-load-test.js" "~13 minutes" || true

sleep 5

# Test 5: Full Flow
run_test "Full Flow Test" "full-flow-test.js" "~17 minutes" || true

sleep 5

# Test 6: Spike Test
run_test "Spike Test" "spike-test.js" "~15 minutes" || true

##############################################################################
# Generate Summary
##############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Test Suite Summary                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Calculate pass rate
PASS_RATE=0
if [ $TESTS_RUN -gt 0 ]; then
  PASS_RATE=$(echo "scale=2; ($TESTS_PASSED / $TESTS_RUN) * 100" | bc)
fi

echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Pass Rate:    ${PASS_RATE}%"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}✗${NC} $test"
  done
  echo ""
fi

# Write summary to file
{
  echo "JoonaPay Load Test Suite Summary"
  echo "================================"
  echo ""
  echo "Timestamp: $TIMESTAMP"
  echo "Base URL: $BASE_URL"
  echo ""
  echo "Results:"
  echo "--------"
  echo "Tests Run:    $TESTS_RUN"
  echo "Tests Passed: $TESTS_PASSED"
  echo "Tests Failed: $TESTS_FAILED"
  echo "Pass Rate:    ${PASS_RATE}%"
  echo ""

  if [ $TESTS_FAILED -gt 0 ]; then
    echo "Failed Tests:"
    for test in "${FAILED_TESTS[@]}"; do
      echo "  - $test"
    done
    echo ""
  fi

  echo "Reports available in: $REPORTS_DIR"

} > "$SUMMARY_FILE"

echo -e "${BLUE}Summary saved to: ${SUMMARY_FILE}${NC}"
echo ""

# List report files
echo -e "${YELLOW}Generated Reports:${NC}"
ls -lh "$REPORTS_DIR"/*.html 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# Overall result
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          ✓ ALL TESTS PASSED                           ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║          ✗ SOME TESTS FAILED                          ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
