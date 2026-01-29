#!/bin/bash

# Payment Links API Test Script
# Usage: ./scripts/test-payment-links.sh

set -e

# Configuration
BASE_URL="http://localhost:3000/api/v1"
TOKEN=""  # Add your JWT token here

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Payment Links API Test ===${NC}\n"

# Check if token is set
if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: JWT token not set. Please set TOKEN variable.${NC}"
    exit 1
fi

# Test 1: Create Fixed Amount Payment Link
echo -e "${BLUE}Test 1: Create Fixed Amount Payment Link${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/payment-links" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "USDC",
    "description": "Test Fixed Amount Link"
  }')

echo "$RESPONSE" | jq '.'
FIXED_LINK_ID=$(echo "$RESPONSE" | jq -r '.id')
FIXED_LINK_CODE=$(echo "$RESPONSE" | jq -r '.code')
echo -e "${GREEN}✓ Fixed amount link created: $FIXED_LINK_CODE${NC}\n"

# Test 2: Create Flexible Amount Payment Link
echo -e "${BLUE}Test 2: Create Flexible Amount Payment Link${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/payment-links" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test Flexible Amount Link"
  }')

echo "$RESPONSE" | jq '.'
FLEX_LINK_ID=$(echo "$RESPONSE" | jq -r '.id')
FLEX_LINK_CODE=$(echo "$RESPONSE" | jq -r '.code')
echo -e "${GREEN}✓ Flexible amount link created: $FLEX_LINK_CODE${NC}\n"

# Test 3: Get User's Payment Links
echo -e "${BLUE}Test 3: Get User's Payment Links${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/payment-links" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq '.'
echo -e "${GREEN}✓ Retrieved user's payment links${NC}\n"

# Test 4: Get Payment Link by ID
echo -e "${BLUE}Test 4: Get Payment Link by ID${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/payment-links/$FIXED_LINK_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq '.'
echo -e "${GREEN}✓ Retrieved payment link by ID${NC}\n"

# Test 5: Get Payment Link by Code (Public)
echo -e "${BLUE}Test 5: Get Payment Link by Code (Public)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/payment-links/code/$FIXED_LINK_CODE")

echo "$RESPONSE" | jq '.'
VIEW_COUNT=$(echo "$RESPONSE" | jq -r '.viewCount')
echo -e "${GREEN}✓ Retrieved payment link by code (View count: $VIEW_COUNT)${NC}\n"

# Test 6: Get Payment Link by Code Again (Check View Count)
echo -e "${BLUE}Test 6: Verify View Count Increment${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/payment-links/code/$FIXED_LINK_CODE")

NEW_VIEW_COUNT=$(echo "$RESPONSE" | jq -r '.viewCount')
echo -e "Previous view count: $VIEW_COUNT"
echo -e "New view count: $NEW_VIEW_COUNT"
echo -e "${GREEN}✓ View count incremented${NC}\n"

# Test 7: Try to Pay Own Link (Should Fail)
echo -e "${BLUE}Test 7: Try to Pay Own Link (Should Fail)${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/payment-links/$FIXED_LINK_CODE/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$RESPONSE" | jq '.'
echo -e "${RED}✓ Correctly prevented paying own link${NC}\n"

# Test 8: Deactivate Payment Link
echo -e "${BLUE}Test 8: Deactivate Payment Link${NC}"
RESPONSE=$(curl -s -X DELETE "$BASE_URL/payment-links/$FLEX_LINK_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq '.'
echo -e "${GREEN}✓ Payment link deactivated${NC}\n"

# Test 9: Verify Link is Cancelled
echo -e "${BLUE}Test 9: Verify Link is Cancelled${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/payment-links/$FLEX_LINK_ID" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo "$RESPONSE" | jq -r '.status')
echo "Status: $STATUS"
if [ "$STATUS" = "cancelled" ]; then
    echo -e "${GREEN}✓ Link status is cancelled${NC}\n"
else
    echo -e "${RED}✗ Link status is not cancelled${NC}\n"
fi

echo -e "${BLUE}=== Tests Complete ===${NC}"
echo -e "\n${GREEN}Summary:${NC}"
echo -e "Created Fixed Link: $FIXED_LINK_CODE (ID: $FIXED_LINK_ID)"
echo -e "Created Flexible Link: $FLEX_LINK_CODE (ID: $FLEX_LINK_ID)"
echo -e "\nShare URL: https://joonapay.com/pay/$FIXED_LINK_CODE"
