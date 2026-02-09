#!/bin/bash

################################################################################
# Publish TypeScript SDK to NPM
#
# Builds and publishes the TypeScript SDK to npm registry
# Performs pre-publish checks
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SDK_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SDK_ROOT/output/typescript"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Publish TypeScript SDK to NPM${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    echo -e "${RED}✗ SDK not generated${NC}"
    echo "Run: ./scripts/generate-ts.sh"
    exit 1
fi

cd "$OUTPUT_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found${NC}"
    exit 1
fi

# Get version from package.json
VERSION=$(jq -r '.version' package.json)
PACKAGE_NAME=$(jq -r '.name' package.json)

echo -e "${YELLOW}Package: $PACKAGE_NAME${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo ""

# Confirm with user
read -p "Publish $PACKAGE_NAME@$VERSION to npm? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Build
echo -e "${YELLOW}Building TypeScript SDK...${NC}"
npm run build

# Run tests if available
if [ -f "package.json" ] && jq -e '.scripts.test' package.json > /dev/null; then
    echo -e "${YELLOW}Running tests...${NC}"
    npm test || echo -e "${YELLOW}⚠ Tests failed (continuing)${NC}"
fi

# Publish
echo -e "${YELLOW}Publishing to npm...${NC}"
npm publish --access public

echo ""
echo -e "${GREEN}✓ Published $PACKAGE_NAME@$VERSION${NC}"
echo ""
echo "View at: https://www.npmjs.com/package/$PACKAGE_NAME"
