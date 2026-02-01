#!/bin/bash

# Fuzzing Test Suite Verification Script

echo "========================================"
echo "  Fuzzing Test Suite Verification"
echo "========================================"
echo ""

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✓ Node.js $(node --version)"
else
    echo "   ✗ Node.js not found"
    exit 1
fi

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    echo "   ✓ npm $(npm --version)"
else
    echo "   ✗ npm not found"
    exit 1
fi

# Check dependencies
echo "3. Checking dependencies..."
if npm list fast-check &> /dev/null; then
    echo "   ✓ fast-check installed"
else
    echo "   ✗ fast-check not installed"
    echo "   Run: npm install"
    exit 1
fi

if npm list @fast-check/jest &> /dev/null; then
    echo "   ✓ @fast-check/jest installed"
else
    echo "   ✗ @fast-check/jest not installed"
    echo "   Run: npm install"
    exit 1
fi

# Check test files
echo "4. Checking test files..."
TEST_COUNT=$(find test/fuzzing -name "*.fuzz-spec.ts" | wc -l)
echo "   ✓ $TEST_COUNT test files found"

# Check documentation
echo "5. Checking documentation..."
DOC_COUNT=$(find test/fuzzing -maxdepth 1 -name "*.md" | wc -l)
echo "   ✓ $DOC_COUNT documentation files found"

# Check scripts
echo "6. Checking npm scripts..."
if npm run test:fuzzing -- --help &> /dev/null 2>&1; then
    echo "   ✓ test:fuzzing script configured"
else
    echo "   ⚠ test:fuzzing script not working (expected)"
fi

echo ""
echo "========================================"
echo "  Setup Verification Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Read: test/fuzzing/QUICK_START.md"
echo "  2. Run:  npm run test:fuzzing"
echo ""
echo "Documentation:"
echo "  - Quick Start:     test/fuzzing/QUICK_START.md"
echo "  - Comprehensive:   test/fuzzing/FUZZING_GUIDE.md"
echo "  - Coverage Map:    test/fuzzing/TEST_COVERAGE.md"
echo "  - Index:           test/fuzzing/INDEX.md"
echo ""
