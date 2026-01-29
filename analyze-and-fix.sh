#!/bin/bash
# Analyze build errors and generate fixes

cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet

echo "Running build to capture errors..."
npm run build 2>&1 | tee /tmp/ts-errors-full.txt

echo ""
echo "=== Error Summary ==="
echo ""

# Count error types
echo "TS2564 (no initializer):"
grep -c "TS2564" /tmp/ts-errors-full.txt || echo "0"

echo "TS6133 (unused variable):"
grep -c "TS6133" /tmp/ts-errors-full.txt || echo "0"

echo "TS6138 (unused private member):"
grep -c "TS6138" /tmp/ts-errors-full.txt || echo "0"

echo "TS2345 (type mismatch):"
grep -c "TS2345" /tmp/ts-errors-full.txt || echo "0"

echo "TS2322 (assignment error):"
grep -c "TS2322" /tmp/ts-errors-full.txt || echo "0"

echo "TS2769 (no overload matches):"
grep -c "TS2769" /tmp/ts-errors-full.txt || echo "0"

echo ""
echo "Total errors:"
grep "Found.*error" /tmp/ts-errors-full.txt | tail -1

echo ""
echo "Sample errors:"
grep "error TS" /tmp/ts-errors-full.txt | head -20
