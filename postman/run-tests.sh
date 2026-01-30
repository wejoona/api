#!/bin/bash

# JoonaPay API - Newman Test Runner
# Run Postman collection tests from command line

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTION="$SCRIPT_DIR/JoonaPay_API.postman_collection.json"

# Default values
ENVIRONMENT="local"
FOLDER=""
DELAY=0
REPORTERS="cli"
OUTPUT_DIR="$SCRIPT_DIR/test-results"

# Help message
show_help() {
    cat << EOF
Usage: ./run-tests.sh [OPTIONS]

Run JoonaPay API tests using Newman

OPTIONS:
    -e, --env ENV          Environment (local, staging, production) [default: local]
    -f, --folder FOLDER    Run specific folder (e.g., "Authentication")
    -d, --delay MS         Delay between requests in milliseconds [default: 0]
    -r, --reporters LIST   Comma-separated list of reporters (cli, json, html, junit)
    -o, --output DIR       Output directory for reports [default: ./test-results]
    -h, --help             Show this help message

EXAMPLES:
    # Run all tests on local environment
    ./run-tests.sh

    # Run only authentication tests
    ./run-tests.sh --folder "Authentication"

    # Run on staging with HTML report
    ./run-tests.sh --env staging --reporters cli,htmlextra

    # Run with delay (rate limiting)
    ./run-tests.sh --delay 500

    # Full CI/CD example
    ./run-tests.sh --env staging --reporters cli,junit,htmlextra --output ./reports

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--folder)
            FOLDER="$2"
            shift 2
            ;;
        -d|--delay)
            DELAY="$2"
            shift 2
            ;;
        -r|--reporters)
            REPORTERS="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    local)
        ENV_FILE="$SCRIPT_DIR/JoonaPay_Local.postman_environment.json"
        ;;
    staging)
        ENV_FILE="$SCRIPT_DIR/JoonaPay_Staging.postman_environment.json"
        ;;
    production)
        ENV_FILE="$SCRIPT_DIR/JoonaPay_Production.postman_environment.json"
        echo -e "${YELLOW}WARNING: Running tests on PRODUCTION environment!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Aborted."
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Use local, staging, or production.${NC}"
        exit 1
        ;;
esac

# Check if files exist
if [ ! -f "$COLLECTION" ]; then
    echo -e "${RED}Error: Collection file not found: $COLLECTION${NC}"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: Newman is not installed${NC}"
    echo -e "Install with: ${BLUE}npm install -g newman${NC}"
    exit 1
fi

# Check if htmlextra reporter is needed
if [[ "$REPORTERS" == *"htmlextra"* ]]; then
    if ! newman run --help | grep -q "htmlextra"; then
        echo -e "${YELLOW}Installing newman-reporter-htmlextra...${NC}"
        npm install -g newman-reporter-htmlextra
    fi
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build Newman command
NEWMAN_CMD="newman run \"$COLLECTION\" -e \"$ENV_FILE\""

if [ -n "$FOLDER" ]; then
    NEWMAN_CMD="$NEWMAN_CMD --folder \"$FOLDER\""
fi

if [ "$DELAY" -gt 0 ]; then
    NEWMAN_CMD="$NEWMAN_CMD --delay-request $DELAY"
fi

# Add reporters
NEWMAN_CMD="$NEWMAN_CMD --reporters $REPORTERS"

# Add reporter options
IFS=',' read -ra REPORTER_ARRAY <<< "$REPORTERS"
for reporter in "${REPORTER_ARRAY[@]}"; do
    case $reporter in
        json)
            NEWMAN_CMD="$NEWMAN_CMD --reporter-json-export \"$OUTPUT_DIR/results.json\""
            ;;
        junit)
            NEWMAN_CMD="$NEWMAN_CMD --reporter-junit-export \"$OUTPUT_DIR/results.xml\""
            ;;
        htmlextra)
            NEWMAN_CMD="$NEWMAN_CMD --reporter-htmlextra-export \"$OUTPUT_DIR/report.html\""
            NEWMAN_CMD="$NEWMAN_CMD --reporter-htmlextra-darkTheme"
            NEWMAN_CMD="$NEWMAN_CMD --reporter-htmlextra-title \"JoonaPay API Test Report\""
            ;;
    esac
done

# Print test configuration
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  JoonaPay API - Newman Test Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Environment:  ${GREEN}$ENVIRONMENT${NC}"
echo -e "Env File:     $ENV_FILE"
if [ -n "$FOLDER" ]; then
    echo -e "Folder:       ${YELLOW}$FOLDER${NC}"
else
    echo -e "Folder:       ${YELLOW}All${NC}"
fi
echo -e "Delay:        ${DELAY}ms"
echo -e "Reporters:    $REPORTERS"
echo -e "Output Dir:   $OUTPUT_DIR"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Run Newman
echo -e "${BLUE}Running tests...${NC}"
echo ""

# Execute command
eval $NEWMAN_CMD

# Check exit code
EXIT_CODE=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"

    # Show report locations
    if [[ "$REPORTERS" == *"json"* ]]; then
        echo -e "JSON Report:  $OUTPUT_DIR/results.json"
    fi
    if [[ "$REPORTERS" == *"junit"* ]]; then
        echo -e "JUnit Report: $OUTPUT_DIR/results.xml"
    fi
    if [[ "$REPORTERS" == *"htmlextra"* ]]; then
        echo -e "HTML Report:  $OUTPUT_DIR/report.html"
        echo -e "${BLUE}Open with:    open $OUTPUT_DIR/report.html${NC}"
    fi
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "${YELLOW}Check the output above for details${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
