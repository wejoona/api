#!/bin/bash

# Load Testing Runner for USDC Wallet API
# Usage: ./run-tests.sh [user-journey|stress] [api-url] [test-token]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
TEST_TYPE="${1:-user-journey}"
API_URL="${2:-http://localhost:3000/api/v1}"
TEST_TOKEN="${3:-}"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed. Please install it first:"
    echo "  macOS:   brew install k6"
    echo "  Ubuntu:  See instructions in README.md"
    echo "  Windows: choco install k6"
    exit 1
fi

# Load config.json if exists
CONFIG_FILE="$SCRIPT_DIR/config.json"
if [ -f "$CONFIG_FILE" ]; then
    print_info "Loading configuration from config.json"

    # Extract values using grep and sed (portable approach)
    if [ -z "$TEST_TOKEN" ]; then
        TEST_TOKEN=$(grep -o '"testToken"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/')
    fi

    if [ "$API_URL" == "http://localhost:3000/api/v1" ]; then
        CONFIG_API_URL=$(grep -o '"apiUrl"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/')
        if [ -n "$CONFIG_API_URL" ]; then
            API_URL="$CONFIG_API_URL"
        fi
    fi
fi

# Validate test token
if [ -z "$TEST_TOKEN" ] || [ "$TEST_TOKEN" == "your-test-token-here" ]; then
    print_warning "No valid test token provided!"
    print_warning "Set TEST_TOKEN environment variable or pass as third argument"
    print_warning "Using placeholder token - tests will likely fail"
    TEST_TOKEN="test-token-replace-with-actual"
fi

# Print test configuration
print_info "Test Configuration:"
echo "  Test Type: $TEST_TYPE"
echo "  API URL:   $API_URL"
echo "  Token:     ${TEST_TOKEN:0:20}... (truncated)"
echo ""

# Run the appropriate test
case "$TEST_TYPE" in
    user-journey|journey|user)
        print_info "Running User Journey Test..."
        k6 run \
            -e API_URL="$API_URL" \
            -e TEST_TOKEN="$TEST_TOKEN" \
            "$SCRIPT_DIR/user-journey.js"
        ;;

    stress|stress-test)
        print_info "Running Stress Test..."
        print_warning "This test will run for ~21 minutes"
        k6 run \
            -e API_URL="$API_URL" \
            -e TEST_TOKEN="$TEST_TOKEN" \
            "$SCRIPT_DIR/stress-test.js"
        ;;

    *)
        print_error "Unknown test type: $TEST_TYPE"
        echo ""
        echo "Usage: $0 [test-type] [api-url] [test-token]"
        echo ""
        echo "Test Types:"
        echo "  user-journey  - Realistic user journey (default)"
        echo "  stress        - High load stress test"
        echo ""
        echo "Examples:"
        echo "  $0 user-journey"
        echo "  $0 stress http://localhost:3000/api/v1 eyJhbGci..."
        echo "  $0 user-journey https://staging.example.com/api/v1"
        exit 1
        ;;
esac

print_info "Test completed!"
