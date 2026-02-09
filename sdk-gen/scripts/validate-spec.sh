#!/bin/bash

################################################################################
# Validate OpenAPI Specification
#
# Validates the OpenAPI spec before generation
# Uses Redocly CLI for comprehensive validation
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OpenAPI Specification Validator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if API is running
if ! curl -s http://localhost:3000/docs-json > /dev/null 2>&1; then
    echo -e "${RED}✗ API is not running${NC}"
    echo "Please start the API server first:"
    echo "  cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet"
    echo "  npm run start:dev"
    exit 1
fi

echo -e "${YELLOW}Downloading OpenAPI spec...${NC}"
SPEC_FILE=$(mktemp)
curl -s http://localhost:3000/docs-json > "$SPEC_FILE"

echo -e "${GREEN}✓ Spec downloaded${NC}"
echo ""

# Basic JSON validation
echo -e "${YELLOW}Validating JSON syntax...${NC}"
if ! jq empty "$SPEC_FILE" 2>/dev/null; then
    echo -e "${RED}✗ Invalid JSON${NC}"
    rm "$SPEC_FILE"
    exit 1
fi
echo -e "${GREEN}✓ Valid JSON${NC}"
echo ""

# Check required OpenAPI fields
echo -e "${YELLOW}Validating OpenAPI structure...${NC}"

if ! jq -e '.openapi' "$SPEC_FILE" > /dev/null; then
    echo -e "${RED}✗ Missing 'openapi' field${NC}"
    rm "$SPEC_FILE"
    exit 1
fi

if ! jq -e '.info' "$SPEC_FILE" > /dev/null; then
    echo -e "${RED}✗ Missing 'info' field${NC}"
    rm "$SPEC_FILE"
    exit 1
fi

if ! jq -e '.paths' "$SPEC_FILE" > /dev/null; then
    echo -e "${RED}✗ Missing 'paths' field${NC}"
    rm "$SPEC_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Valid OpenAPI structure${NC}"
echo ""

# Display spec summary
echo -e "${BLUE}Specification Summary:${NC}"
echo -e "OpenAPI Version: ${GREEN}$(jq -r '.openapi' "$SPEC_FILE")${NC}"
echo -e "API Title: ${GREEN}$(jq -r '.info.title' "$SPEC_FILE")${NC}"
echo -e "API Version: ${GREEN}$(jq -r '.info.version' "$SPEC_FILE")${NC}"
echo -e "Endpoints: ${GREEN}$(jq '.paths | keys | length' "$SPEC_FILE")${NC}"
echo ""

# Validate with Redocly (if available)
if command -v redocly &> /dev/null; then
    echo -e "${YELLOW}Running Redocly validation...${NC}"
    if redocly lint "$SPEC_FILE"; then
        echo -e "${GREEN}✓ Redocly validation passed${NC}"
    else
        echo -e "${YELLOW}⚠ Redocly found some issues (non-blocking)${NC}"
    fi
else
    echo -e "${YELLOW}ℹ Redocly CLI not installed - skipping advanced validation${NC}"
    echo "Install with: npm install -g @redocly/cli"
fi

rm "$SPEC_FILE"

echo ""
echo -e "${GREEN}✓ Validation complete${NC}"
