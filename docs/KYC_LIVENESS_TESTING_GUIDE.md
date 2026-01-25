# KYC & Liveness Testing Guide

## Quick Start

### 1. Start the Server

```bash
npm run start:dev
```

Server will be available at `http://localhost:3000`

## Test Scenarios

### Scenario 1: Complete KYC Flow (Happy Path)

#### Step 1: Upload KYC Documents

```bash
# Create test image files (or use real ones)
# For testing, create dummy JPEG files
dd if=/dev/urandom of=id_front.jpg bs=1024 count=100
dd if=/dev/urandom of=id_back.jpg bs=1024 count=100
dd if=/dev/urandom of=selfie.jpg bs=1024 count=100

# Upload documents (replace YOUR_TOKEN with actual JWT)
curl -X POST http://localhost:3000/kyc/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idFront=@id_front.jpg" \
  -F "idBack=@id_back.jpg" \
  -F "selfie=@selfie.jpg"

# Expected Response:
{
  "success": true,
  "documents": {
    "idFront": {
      "key": "kyc/user-123/id_front-1737800000000.jpg",
      "uploaded": true
    },
    "idBack": {
      "key": "kyc/user-123/id_back-1737800000000.jpg",
      "uploaded": true
    },
    "selfie": {
      "key": "kyc/user-123/selfie-1737800000000.jpg",
      "uploaded": true
    }
  },
  "message": "All documents uploaded successfully"
}
```

#### Step 2: Start Liveness Session

```bash
curl -X POST http://localhost:3000/liveness/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "currentChallenge": {
    "challengeId": "550e8400-e29b-41d4-a716-446655440001",
    "type": "blink",
    "instruction": "Please blink your eyes slowly",
    "expiresAt": "2026-01-25T12:35:00.000Z",
    "order": 1
  },
  "totalChallenges": 3,
  "expiresAt": "2026-01-25T12:35:00.000Z"
}

# Save the sessionId and challengeId for next step
```

#### Step 3: Submit Challenge #1

```bash
# Create a base64 encoded dummy image (in production, this would be a real video frame)
BASE64_IMAGE="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmQ/9k="

curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "challengeId": "550e8400-e29b-41d4-a716-446655440001",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'

# Expected Response:
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "passed": true,
  "confidence": 87,
  "nextChallenge": {
    "challengeId": "550e8400-e29b-41d4-a716-446655440002",
    "type": "smile",
    "instruction": "Please smile naturally",
    "expiresAt": "2026-01-25T12:31:00.000Z",
    "order": 2
  },
  "sessionComplete": false,
  "completedCount": 1,
  "totalChallenges": 3
}

# Repeat for remaining challenges (smile, turn_head, or nod)
```

#### Step 4: Submit Remaining Challenges

```bash
# Challenge #2
curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "challengeId": "550e8400-e29b-41d4-a716-446655440002",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'

# Challenge #3 (if totalChallenges is 3)
curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "challengeId": "550e8400-e29b-41d4-a716-446655440003",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'
```

#### Step 5: Complete Session

```bash
curl -X POST http://localhost:3000/liveness/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Expected Response:
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "isLive": true,
  "confidence": 89,
  "challenges": [
    {
      "type": "blink",
      "passed": true,
      "confidence": 92,
      "submittedAt": "2026-01-25T12:30:15.000Z"
    },
    {
      "type": "smile",
      "passed": true,
      "confidence": 87,
      "submittedAt": "2026-01-25T12:30:32.000Z"
    },
    {
      "type": "turn_head",
      "passed": true,
      "confidence": 88,
      "submittedAt": "2026-01-25T12:30:48.000Z"
    }
  ],
  "status": "completed",
  "completedAt": "2026-01-25T12:30:48.000Z"
}
```

#### Step 6: Check Session Status (Optional)

```bash
curl -X GET http://localhost:3000/liveness/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns the same LivenessResult as complete endpoint
```

### Scenario 2: Failed Challenge

The mock service has a 95% pass rate, so approximately 1 in 20 challenges will fail.

**Expected Behavior:**
- If a challenge fails (5% chance), you'll get `"passed": false` with low confidence (0-69)
- Session can still continue to next challenge
- Final result will be `"isLive": false` if any challenge failed

**Response for Failed Challenge:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "passed": false,
  "confidence": 42,
  "nextChallenge": {
    "challengeId": "...",
    "type": "smile",
    "instruction": "Please smile naturally",
    "expiresAt": "2026-01-25T12:31:00.000Z",
    "order": 2
  },
  "sessionComplete": false,
  "completedCount": 1,
  "totalChallenges": 3
}
```

### Scenario 3: Session Expiry

Sessions expire after 5 minutes of inactivity.

**Test:**
```bash
# 1. Start session
SESSION_RESPONSE=$(curl -X POST http://localhost:3000/liveness/start \
  -H "Authorization: Bearer YOUR_TOKEN")

# 2. Wait 6 minutes (or mock by waiting 10 seconds for testing)
# The service checks expiry on next action

# 3. Try to submit challenge after expiry
curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "EXPIRED_SESSION_ID",
    "challengeId": "CHALLENGE_ID",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'

# Expected Error:
{
  "statusCode": 400,
  "message": "Liveness session has expired",
  "error": "Bad Request"
}
```

### Scenario 4: Challenge Expiry

Each challenge expires after 30 seconds.

**Test:**
```bash
# 1. Start session and get challenge
# 2. Wait 31 seconds
# 3. Try to submit that challenge

# Expected Error:
{
  "statusCode": 400,
  "message": "Challenge has expired",
  "error": "Bad Request"
}
```

### Scenario 5: Invalid Session ID

**Test:**
```bash
curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "invalid-session-id",
    "challengeId": "some-challenge",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'

# Expected Error:
{
  "statusCode": 404,
  "message": "Liveness session not found or expired",
  "error": "Not Found"
}
```

### Scenario 6: Wrong Challenge Order

You must submit challenges in order.

**Test:**
```bash
# 1. Start session (get challenge #1)
# 2. Try to submit challenge #2 first

curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "challengeId": "WRONG_CHALLENGE_ID",
    "videoFrameBase64": "'"$BASE64_IMAGE"'"
  }'

# Expected Error:
{
  "statusCode": 400,
  "message": "Invalid challenge ID or challenge out of order",
  "error": "Bad Request"
}
```

### Scenario 7: Upload File Size Limit

**Test:**
```bash
# Create a 6MB file (exceeds 5MB limit)
dd if=/dev/urandom of=large_file.jpg bs=1024 count=6144

curl -X POST http://localhost:3000/kyc/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idFront=@large_file.jpg" \
  -F "idBack=@id_back.jpg" \
  -F "selfie=@selfie.jpg"

# Expected Error:
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 5MB",
  "error": "Bad Request"
}
```

### Scenario 8: Upload Invalid File Type

**Test:**
```bash
# Create a PDF file
echo "test" > document.pdf

curl -X POST http://localhost:3000/kyc/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idFront=@document.pdf" \
  -F "idBack=@id_back.jpg" \
  -F "selfie=@selfie.jpg"

# Expected Error:
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp",
  "error": "Bad Request"
}
```

## Automated Testing Script

Save this as `test-kyc-liveness.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
TOKEN="YOUR_JWT_TOKEN_HERE"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}KYC & Liveness Testing Script${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Test 1: Start Liveness Session
echo -e "${YELLOW}Test 1: Starting liveness session...${NC}"
START_RESPONSE=$(curl -s -X POST "$API_URL/liveness/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$START_RESPONSE" | jq .

SESSION_ID=$(echo "$START_RESPONSE" | jq -r '.sessionId')
CHALLENGE_ID=$(echo "$START_RESPONSE" | jq -r '.currentChallenge.challengeId')
TOTAL_CHALLENGES=$(echo "$START_RESPONSE" | jq -r '.totalChallenges')

if [ "$SESSION_ID" != "null" ]; then
  echo -e "${GREEN}✓ Session started successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to start session${NC}\n"
  exit 1
fi

# Test 2: Submit Challenges
BASE64_IMAGE="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmQ/9k="

for ((i=1; i<=TOTAL_CHALLENGES; i++)); do
  echo -e "${YELLOW}Test $((i+1)): Submitting challenge $i/$TOTAL_CHALLENGES...${NC}"

  CHALLENGE_RESPONSE=$(curl -s -X POST "$API_URL/liveness/challenge" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"sessionId\": \"$SESSION_ID\",
      \"challengeId\": \"$CHALLENGE_ID\",
      \"videoFrameBase64\": \"$BASE64_IMAGE\"
    }")

  echo "$CHALLENGE_RESPONSE" | jq .

  PASSED=$(echo "$CHALLENGE_RESPONSE" | jq -r '.passed')
  SESSION_COMPLETE=$(echo "$CHALLENGE_RESPONSE" | jq -r '.sessionComplete')

  if [ "$PASSED" == "true" ]; then
    echo -e "${GREEN}✓ Challenge $i passed${NC}\n"
  else
    echo -e "${RED}✗ Challenge $i failed${NC}\n"
  fi

  if [ "$SESSION_COMPLETE" == "true" ]; then
    break
  fi

  CHALLENGE_ID=$(echo "$CHALLENGE_RESPONSE" | jq -r '.nextChallenge.challengeId')
done

# Test 3: Complete Session
echo -e "${YELLOW}Test $((TOTAL_CHALLENGES+2)): Completing session...${NC}"
COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL/liveness/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}")

echo "$COMPLETE_RESPONSE" | jq .

IS_LIVE=$(echo "$COMPLETE_RESPONSE" | jq -r '.isLive')
CONFIDENCE=$(echo "$COMPLETE_RESPONSE" | jq -r '.confidence')

if [ "$IS_LIVE" == "true" ]; then
  echo -e "${GREEN}✓ Liveness verified! (confidence: $CONFIDENCE)${NC}\n"
else
  echo -e "${RED}✗ Liveness failed (confidence: $CONFIDENCE)${NC}\n"
fi

# Test 4: Check Session Status
echo -e "${YELLOW}Test $((TOTAL_CHALLENGES+3)): Checking session status...${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/liveness/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq .
echo -e "${GREEN}✓ Status retrieved${NC}\n"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}All tests completed!${NC}"
echo -e "${YELLOW}========================================${NC}"
```

**Run the script:**
```bash
chmod +x test-kyc-liveness.sh
./test-kyc-liveness.sh
```

## Using Postman

Import this Postman collection:

1. Create new collection: "KYC & Liveness"
2. Add environment variable: `token` = your JWT
3. Add these requests:

### Collection Structure

```
KYC & Liveness/
├── Upload Documents
│   ├── POST Upload All Documents
│   └── POST Upload Single Document
└── Liveness Check
    ├── POST Start Session
    ├── POST Submit Challenge
    ├── POST Complete Session
    └── GET Session Status
```

### Example Request Bodies

**Start Session:**
- Method: POST
- URL: `{{baseUrl}}/liveness/start`
- Headers: `Authorization: Bearer {{token}}`
- Body: None

**Submit Challenge:**
- Method: POST
- URL: `{{baseUrl}}/liveness/challenge`
- Headers: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- Body:
```json
{
  "sessionId": "{{sessionId}}",
  "challengeId": "{{challengeId}}",
  "videoFrameBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

## Mock Behavior Notes

### Pass Rate
- 95% of valid submissions pass
- Confidence: 70-100 for passing challenges
- Confidence: 0-69 for failing challenges

### Risk Signals
The service detects these suspicious patterns:
- `failed_challenges_detected` - One or more challenges failed
- `low_confidence_detections` - Confidence scores below 50
- `suspicious_completion_speed` - All challenges completed in < 3 seconds

### Challenge Types
Randomly selected from:
- `blink` - "Please blink your eyes slowly"
- `smile` - "Please smile naturally"
- `turn_head` - "Please turn your head slowly to the left, then to the right"
- `nod` - "Please nod your head up and down"

## Troubleshooting

### Issue: "Session not found"
- Session may have expired (5 minutes)
- Wrong session ID
- Session already completed

**Solution:** Start a new session

### Issue: "Challenge has expired"
- Challenge expires after 30 seconds
- Must submit each challenge within time limit

**Solution:** Submit challenges faster or start new session

### Issue: "File too large"
- File exceeds 5MB limit

**Solution:** Use smaller files or compress images

### Issue: "Invalid file type"
- Only JPEG, PNG allowed

**Solution:** Convert files to JPEG or PNG format

### Issue: 401 Unauthorized
- Invalid JWT token
- Token expired

**Solution:** Get a fresh JWT token from login endpoint
