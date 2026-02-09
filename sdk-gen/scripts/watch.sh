#!/bin/bash

################################################################################
# Watch Mode Script
#
# Monitors the OpenAPI spec for changes and automatically regenerates SDKs
# Useful during active API development
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}JoonaPay SDK Generator - Watch Mode${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Monitoring OpenAPI spec for changes...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Store previous spec hash
PREV_HASH=""

while true; do
    # Get current spec
    CURRENT_SPEC=$(curl -s http://localhost:3000/docs-json 2>/dev/null || echo "ERROR")

    if [ "$CURRENT_SPEC" = "ERROR" ]; then
        echo -e "${RED}[$(date '+%H:%M:%S')] API not accessible - waiting...${NC}"
        sleep 5
        continue
    fi

    # Calculate hash of current spec
    CURRENT_HASH=$(echo "$CURRENT_SPEC" | md5sum | cut -d' ' -f1)

    if [ "$PREV_HASH" != "$CURRENT_HASH" ]; then
        if [ -n "$PREV_HASH" ]; then
            echo ""
            echo -e "${GREEN}[$(date '+%H:%M:%S')] OpenAPI spec changed - regenerating SDKs...${NC}"
            echo ""

            # Run generation script
            if bash "$SCRIPT_DIR/generate-all.sh"; then
                echo ""
                echo -e "${GREEN}[$(date '+%H:%M:%S')] SDKs regenerated successfully${NC}"
            else
                echo ""
                echo -e "${RED}[$(date '+%H:%M:%S')] SDK generation failed${NC}"
            fi
        else
            echo -e "${GREEN}[$(date '+%H:%M:%S')] Initial spec loaded${NC}"
        fi

        PREV_HASH=$CURRENT_HASH
    fi

    # Wait before checking again
    sleep 10
done
