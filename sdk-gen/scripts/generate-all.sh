#!/bin/bash

################################################################################
# Generate All SDKs Script
#
# This script generates TypeScript and Dart SDKs from the OpenAPI specification
# Runs both generators in sequence and reports results
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SDK_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}JoonaPay SDK Generator - Generate All${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if API is running
check_api_running() {
    echo -e "${YELLOW}Checking if API is running...${NC}"

    if curl -s http://localhost:3000/docs-json > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is running${NC}"
        return 0
    else
        echo -e "${RED}✗ API is not running${NC}"
        echo ""
        echo "Please start the API server first:"
        echo "  cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet"
        echo "  npm run start:dev"
        echo ""
        exit 1
    fi
}

# Function to validate OpenAPI spec
validate_spec() {
    echo -e "${YELLOW}Validating OpenAPI specification...${NC}"

    # Download spec to temp file
    SPEC_FILE=$(mktemp)
    curl -s http://localhost:3000/docs-json > "$SPEC_FILE"

    # Basic validation - check if it's valid JSON
    if ! jq empty "$SPEC_FILE" 2>/dev/null; then
        echo -e "${RED}✗ Invalid JSON in OpenAPI spec${NC}"
        rm "$SPEC_FILE"
        exit 1
    fi

    # Check if it has required OpenAPI fields
    if ! jq -e '.openapi' "$SPEC_FILE" > /dev/null 2>&1; then
        echo -e "${RED}✗ Not a valid OpenAPI specification${NC}"
        rm "$SPEC_FILE"
        exit 1
    fi

    rm "$SPEC_FILE"
    echo -e "${GREEN}✓ OpenAPI spec is valid${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check if npx is available
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}✗ npx not found${NC}"
        echo "Please install Node.js and npm"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
}

# Main execution
main() {
    cd "$SDK_ROOT"

    echo -e "${BLUE}Working directory: $SDK_ROOT${NC}"
    echo ""

    # Run checks
    check_prerequisites
    check_api_running
    validate_spec

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Generating SDKs...${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Generate TypeScript SDK
    echo -e "${YELLOW}[1/2] Generating TypeScript SDK...${NC}"
    if bash "$SCRIPT_DIR/generate-ts.sh"; then
        echo -e "${GREEN}✓ TypeScript SDK generated successfully${NC}"
        TS_SUCCESS=true
    else
        echo -e "${RED}✗ TypeScript SDK generation failed${NC}"
        TS_SUCCESS=false
    fi

    echo ""

    # Generate Dart SDK
    echo -e "${YELLOW}[2/2] Generating Dart SDK...${NC}"
    if bash "$SCRIPT_DIR/generate-dart.sh"; then
        echo -e "${GREEN}✓ Dart SDK generated successfully${NC}"
        DART_SUCCESS=true
    else
        echo -e "${RED}✗ Dart SDK generation failed${NC}"
        DART_SUCCESS=false
    fi

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Generation Summary${NC}"
    echo -e "${BLUE}========================================${NC}"

    if [ "$TS_SUCCESS" = true ]; then
        echo -e "${GREEN}✓ TypeScript SDK${NC} → output/typescript/"
    else
        echo -e "${RED}✗ TypeScript SDK${NC} → Failed"
    fi

    if [ "$DART_SUCCESS" = true ]; then
        echo -e "${GREEN}✓ Dart SDK${NC} → output/dart/"
    else
        echo -e "${RED}✗ Dart SDK${NC} → Failed"
    fi

    echo ""

    # Exit with error if any generation failed
    if [ "$TS_SUCCESS" = true ] && [ "$DART_SUCCESS" = true ]; then
        echo -e "${GREEN}All SDKs generated successfully!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Review generated SDKs in output/ directory"
        echo "  2. Run tests to verify SDKs work correctly"
        echo "  3. Update version numbers if needed"
        echo "  4. Publish to package repositories"
        exit 0
    else
        echo -e "${RED}Some SDK generations failed${NC}"
        exit 1
    fi
}

# Run main function
main
