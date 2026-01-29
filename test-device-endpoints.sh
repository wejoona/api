#!/bin/bash

# Device Module API Testing Script
# This script tests all device management endpoints

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_PREFIX="${API_PREFIX:-/api/v1}"
JWT_TOKEN="${JWT_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}Error: JWT_TOKEN environment variable is required${NC}"
    echo "Usage: JWT_TOKEN=your_token_here $0"
    exit 1
fi

# Device ID will be set after registration
DEVICE_ID=""

echo "======================================"
echo "Device Module API Testing"
echo "======================================"
echo ""

# Test 1: Register a new device
print_info "Test 1: Register a new device"
DEVICE_IDENTIFIER="test-device-$(date +%s)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}/devices/register" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"deviceIdentifier\": \"${DEVICE_IDENTIFIER}\",
        \"brand\": \"Samsung\",
        \"model\": \"Galaxy S23\",
        \"os\": \"Android\",
        \"osVersion\": \"13.0\",
        \"appVersion\": \"1.0.0\",
        \"platform\": \"android\",
        \"fcmToken\": \"test-fcm-token-123\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Device registered successfully"
    DEVICE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Device ID: $DEVICE_ID"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to register device (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 2: Get active devices
print_info "Test 2: Get active devices"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PREFIX}/devices" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Retrieved active devices"
    DEVICE_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "Active devices: $DEVICE_COUNT"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to get devices (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 3: Get all devices (including inactive)
print_info "Test 3: Get all devices"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PREFIX}/devices/all" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Retrieved all devices"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to get all devices (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 4: Update FCM token
print_info "Test 4: Update FCM token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}/devices/fcm-token" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"deviceIdentifier\": \"${DEVICE_IDENTIFIER}\",
        \"fcmToken\": \"updated-fcm-token-456\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "FCM token updated"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to update FCM token (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 5: Trust device
if [ -n "$DEVICE_ID" ]; then
    print_info "Test 5: Trust device"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}/devices/${DEVICE_ID}/trust" \
        -H "Authorization: Bearer ${JWT_TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Device trusted"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to trust device (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
    echo ""
fi

# Test 6: Untrust device
if [ -n "$DEVICE_ID" ]; then
    print_info "Test 6: Untrust device"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}/devices/${DEVICE_ID}/untrust" \
        -H "Authorization: Bearer ${JWT_TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Device untrusted"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to untrust device (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
    echo ""
fi

# Test 7: Revoke specific device
if [ -n "$DEVICE_ID" ]; then
    print_info "Test 7: Revoke specific device"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${API_PREFIX}/devices/${DEVICE_ID}" \
        -H "Authorization: Bearer ${JWT_TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Device revoked"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to revoke device (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
    echo ""
fi

# Test 8: Register another device for bulk test
print_info "Test 8: Register additional device for bulk revoke test"
DEVICE_IDENTIFIER_2="test-device-$(date +%s)-2"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}/devices/register" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"deviceIdentifier\": \"${DEVICE_IDENTIFIER_2}\",
        \"brand\": \"Apple\",
        \"model\": \"iPhone 15\",
        \"os\": \"iOS\",
        \"osVersion\": \"17.0\",
        \"appVersion\": \"1.0.0\",
        \"platform\": \"ios\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Second device registered"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to register second device (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 9: Revoke all devices
print_info "Test 9: Revoke all devices"
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${API_PREFIX}/devices" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "All devices revoked"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to revoke all devices (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 10: Verify devices were revoked
print_info "Test 10: Verify devices were revoked (should show 0 active devices)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PREFIX}/devices" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    ACTIVE_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$ACTIVE_COUNT" -eq 0 ]; then
        print_success "Verified: No active devices remaining"
    else
        print_error "Unexpected: Still found $ACTIVE_COUNT active device(s)"
    fi
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Failed to verify devices (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

echo "======================================"
echo "Testing Complete"
echo "======================================"
