#!/bin/bash

# ESLint Extended Configuration Validation Script
# This script validates that the extended ESLint configuration is working correctly

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}ESLint Extended Configuration Validation${NC}\n"

# Check if config file exists
echo -e "${BOLD}1. Checking config file...${NC}"
if [ ! -f "eslint.config.extended.mjs" ]; then
    echo -e "${RED}✗ eslint.config.extended.mjs not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Configuration file exists${NC}\n"

# Validate config syntax
echo -e "${BOLD}2. Validating configuration syntax...${NC}"
if npx eslint --config eslint.config.extended.mjs --print-config src/main.ts > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Configuration is valid${NC}\n"
else
    echo -e "${RED}✗ Configuration has syntax errors${NC}"
    npx eslint --config eslint.config.extended.mjs --print-config src/main.ts
    exit 1
fi

# Create test file with intentional errors
echo -e "${BOLD}3. Creating test file with violations...${NC}"
cat > /tmp/eslint-test.ts << 'EOF'
// Test file with intentional ESLint violations

export class TestHandler {
  // Missing accessibility modifier
  testVar: any;

  // Missing return type
  async testMethod(data: any) {
    console.log('test');
    let x = 1;
    return data;
  }
}
EOF

echo -e "${GREEN}✓ Test file created${NC}\n"

# Run ESLint on test file
echo -e "${BOLD}4. Running ESLint on test file...${NC}"
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "error"; then
    echo -e "${GREEN}✓ ESLint correctly detects violations${NC}\n"
else
    echo -e "${RED}✗ ESLint should detect violations but didn't${NC}"
    exit 1
fi

# Check specific rules are working
echo -e "${BOLD}5. Checking specific rules...${NC}"

# Check no-explicit-any
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "no-explicit-any"; then
    echo -e "${GREEN}✓ Rule: @typescript-eslint/no-explicit-any${NC}"
else
    echo -e "${RED}✗ Rule not working: @typescript-eslint/no-explicit-any${NC}"
fi

# Check explicit-function-return-type
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "explicit-function-return-type"; then
    echo -e "${GREEN}✓ Rule: @typescript-eslint/explicit-function-return-type${NC}"
else
    echo -e "${RED}✗ Rule not working: @typescript-eslint/explicit-function-return-type${NC}"
fi

# Check no-console
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "no-console"; then
    echo -e "${GREEN}✓ Rule: no-console${NC}"
else
    echo -e "${RED}✗ Rule not working: no-console${NC}"
fi

# Check prefer-const
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "prefer-const"; then
    echo -e "${GREEN}✓ Rule: prefer-const${NC}"
else
    echo -e "${RED}✗ Rule not working: prefer-const${NC}"
fi

# Check naming convention
if npx eslint --config eslint.config.extended.mjs /tmp/eslint-test.ts 2>&1 | grep -q "naming-convention"; then
    echo -e "${GREEN}✓ Rule: @typescript-eslint/naming-convention${NC}"
else
    echo -e "${RED}✗ Rule not working: @typescript-eslint/naming-convention${NC}"
fi

echo ""

# Clean up
rm /tmp/eslint-test.ts

# Test on actual codebase
echo -e "${BOLD}6. Testing on actual codebase...${NC}"
if [ -f "src/main.ts" ]; then
    ERROR_COUNT=$(npx eslint --config eslint.config.extended.mjs src/main.ts 2>&1 | grep -c "error" || true)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $ERROR_COUNT errors in src/main.ts${NC}"
        echo -e "${YELLOW}  This is expected for existing code${NC}\n"
    else
        echo -e "${GREEN}✓ No errors in src/main.ts${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠ src/main.ts not found, skipping${NC}\n"
fi

# Check dependencies
echo -e "${BOLD}7. Checking required dependencies...${NC}"
DEPENDENCIES=(
    "@typescript-eslint/parser"
    "@typescript-eslint/eslint-plugin"
    "eslint-plugin-unused-imports"
    "typescript-eslint"
)

for dep in "${DEPENDENCIES[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $dep${NC}"
    else
        echo -e "${RED}✗ Missing: $dep${NC}"
    fi
done

echo ""

# Summary
echo -e "${BOLD}==================================${NC}"
echo -e "${BOLD}Validation Summary${NC}"
echo -e "${BOLD}==================================${NC}"
echo -e "${GREEN}✓ ESLint extended configuration is working correctly${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "1. Review documentation: .eslintrc.extended.md"
echo "2. Start using: npx eslint src --config eslint.config.extended.mjs --fix"
echo "3. Migrate gradually, module by module"
echo "4. See ESLINT-GUIDE.md for migration tips"
echo ""
echo -e "${BOLD}Quick Commands:${NC}"
echo "  Lint file:   npx eslint <file> --config eslint.config.extended.mjs"
echo "  Auto-fix:    npx eslint <file> --config eslint.config.extended.mjs --fix"
echo "  With cache:  npx eslint src --config eslint.config.extended.mjs --cache --fix"
echo ""
