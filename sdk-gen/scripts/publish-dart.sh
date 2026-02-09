#!/bin/bash

################################################################################
# Publish Dart SDK to pub.dev
#
# Builds and publishes the Dart SDK to pub.dev registry
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
OUTPUT_DIR="$SDK_ROOT/output/dart"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Publish Dart SDK to pub.dev${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    echo -e "${RED}✗ SDK not generated${NC}"
    echo "Run: ./scripts/generate-dart.sh"
    exit 1
fi

cd "$OUTPUT_DIR"

# Check if pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
    echo -e "${RED}✗ pubspec.yaml not found${NC}"
    exit 1
fi

# Get version and name
VERSION=$(grep '^version:' pubspec.yaml | awk '{print $2}')
PACKAGE_NAME=$(grep '^name:' pubspec.yaml | awk '{print $2}')

echo -e "${YELLOW}Package: $PACKAGE_NAME${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo ""

# Check if flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}✗ Flutter not installed${NC}"
    exit 1
fi

# Get dependencies
echo -e "${YELLOW}Getting dependencies...${NC}"
flutter pub get

# Analyze code
echo -e "${YELLOW}Analyzing code...${NC}"
flutter analyze || echo -e "${YELLOW}⚠ Analysis warnings (continuing)${NC}"

# Run pub publish dry-run
echo -e "${YELLOW}Running dry-run...${NC}"
flutter pub publish --dry-run

# Confirm with user
echo ""
read -p "Publish $PACKAGE_NAME@$VERSION to pub.dev? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Publish
echo -e "${YELLOW}Publishing to pub.dev...${NC}"
flutter pub publish

echo ""
echo -e "${GREEN}✓ Published $PACKAGE_NAME@$VERSION${NC}"
echo ""
echo "View at: https://pub.dev/packages/$PACKAGE_NAME"
