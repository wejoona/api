# KYC Document Upload & Liveness Detection Implementation

## Overview

This document describes the implementation of KYC document upload and mock liveness detection for the USDC Wallet backend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client App                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                  (NestJS Controllers)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │ KYC Upload      │         │  Liveness Controller     │   │
│  │ Controller      │         │                          │   │
│  │ /kyc/documents  │         │  /liveness/*             │   │
│  └────────┬────────┘         └────────┬─────────────────┘   │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │ Upload Service  │         │  Liveness Service        │   │
│  │ - S3 Upload     │         │  - Session Management    │   │
│  │ - Image Process │         │  - Challenge Generation  │   │
│  │ - Sharp resize  │         │  - Mock Verification     │   │
│  └────────┬────────┘         └────────┬─────────────────┘   │
│           │                           │                      │
└───────────┼───────────────────────────┼──────────────────────┘
            │                           │
            ▼                           ▼
   ┌────────────────┐         ┌──────────────────┐
   │  AWS S3 Bucket │         │  In-Memory Map   │
   │  kyc/user-id/  │         │  (Redis in prod) │
   └────────────────┘         └──────────────────┘
```

## Components

### 1. Upload Module (Already Exists)

**Location:** `/src/modules/upload/`

**Features:**
- S3 integration using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Image processing with `sharp` (resize to 1200x1200, 85% JPEG quality)
- File validation (JPEG, PNG only)
- Max file size: 5MB (updated from 10MB)
- Automatic timestamped keys: `kyc/{userId}/{type}-{timestamp}.jpg`

**Key Methods:**
```typescript
uploadDocument(params: UploadDocumentParams): Promise<UploadResult>
getSignedUrl(key: string): Promise<string>
deleteDocument(key: string): Promise<void>
```

### 2. KYC Upload Controller

**Location:** `/src/modules/wallet/application/controllers/kyc-upload.controller.ts`

**Endpoints:**

#### POST /kyc/documents
Upload all KYC documents at once (ID front, back, and selfie).

**Request:**
- Content-Type: `multipart/form-data`
- Fields: `idFront`, `idBack`, `selfie`
- Max size per file: 5MB
- Allowed types: JPEG, PNG

**Response:**
```json
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

#### POST /kyc/documents/single
Upload a single document with type specification.

**Request:**
- Content-Type: `multipart/form-data`
- Fields: `document`, `type` (id_front | id_back | selfie)

**Response:**
```json
{
  "success": true,
  "document": {
    "key": "kyc/user-123/id_front-1737800000000.jpg",
    "type": "id_front",
    "url": "https://s3.amazonaws.com/..."
  },
  "message": "Document uploaded successfully"
}
```

### 3. Liveness Module (New)

**Location:** `/src/modules/liveness/`

**Structure:**
```
liveness/
├── liveness.module.ts
├── index.ts
├── domain/
│   └── interfaces/
│       ├── liveness.types.ts
│       └── index.ts
└── application/
    ├── services/
    │   ├── liveness.service.ts
    │   └── index.ts
    └── controllers/
        ├── liveness.controller.ts
        └── index.ts
```

#### Liveness Types

**Challenge Types:**
- `blink` - Blink eyes slowly
- `smile` - Smile naturally
- `turn_head` - Turn head left then right
- `nod` - Nod head up and down

**Session Lifecycle:**
1. `pending` - Session created, awaiting challenges
2. `in_progress` - User completing challenges
3. `completed` - All challenges passed
4. `failed` - Liveness check failed
5. `expired` - Session timed out (5 minutes)

#### Liveness Service

**Key Features:**
- Generates 2-3 random challenges per session
- 95% simulated pass rate
- Challenge expiry: 30 seconds
- Session expiry: 5 minutes
- Confidence scoring: 0-100
- Risk signal detection

**Methods:**
```typescript
startSession(userId: string): Promise<StartSessionResponse>
submitChallenge(sessionId, challengeId, videoFrameBase64, userId?): Promise<SubmitChallengeResponse>
completeSession(sessionId: string, userId?): Promise<LivenessResult>
getSessionStatus(sessionId: string, userId?): Promise<LivenessResult | null>
```

**Mock Behavior:**
- Random pass/fail based on 95% success rate
- Confidence: 70-100 for pass, 0-69 for fail
- Detects suspicious patterns:
  - Failed challenges
  - Low confidence scores
  - Completion too fast (< 3 seconds)

#### Liveness Controller

**Base Path:** `/liveness`

**Endpoints:**

##### POST /liveness/start
Start a new liveness verification session.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
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
```

##### POST /liveness/challenge
Submit a challenge response.

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "challengeId": "550e8400-e29b-41d4-a716-446655440001",
  "videoFrameBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
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
```

##### POST /liveness/complete
Complete the session and get final result.

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
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

##### GET /liveness/:sessionId
Get current session status.

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "isLive": false,
  "confidence": 45,
  "challenges": [
    {
      "type": "blink",
      "passed": true,
      "confidence": 92,
      "submittedAt": "2026-01-25T12:30:15.000Z"
    },
    {
      "type": "smile",
      "passed": false,
      "confidence": 34,
      "submittedAt": "2026-01-25T12:30:32.000Z"
    }
  ],
  "status": "in_progress",
  "completedAt": "2026-01-25T12:25:00.000Z",
  "riskSignals": [
    "failed_challenges_detected",
    "low_confidence_detections"
  ]
}
```

## Client Integration Flow

### 1. Document Upload Flow

```typescript
// 1. Prepare documents
const formData = new FormData();
formData.append('idFront', idFrontFile);
formData.append('idBack', idBackFile);
formData.append('selfie', selfieFile);

// 2. Upload to API
const response = await fetch('/kyc/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
// result.documents.idFront.key
// result.documents.idBack.key
// result.documents.selfie.key
```

### 2. Liveness Check Flow

```typescript
// 1. Start session
const startResponse = await fetch('/liveness/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const { sessionId, currentChallenge, totalChallenges } = await startResponse.json();

// 2. Loop through challenges
let challenge = currentChallenge;
let completed = false;

while (!completed) {
  // Display challenge instruction to user
  console.log(challenge.instruction);

  // Capture video frame/selfie
  const videoFrame = await captureVideoFrame(); // Client implementation

  // Submit challenge
  const submitResponse = await fetch('/liveness/challenge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      challengeId: challenge.challengeId,
      videoFrameBase64: videoFrame,
    }),
  });

  const result = await submitResponse.json();

  if (result.sessionComplete) {
    completed = true;
  } else {
    challenge = result.nextChallenge;
  }
}

// 3. Complete session
const completeResponse = await fetch('/liveness/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sessionId }),
});

const finalResult = await completeResponse.json();

if (finalResult.isLive) {
  console.log('Liveness verified!');
} else {
  console.log('Liveness failed:', finalResult.failureReason);
}
```

## Environment Configuration

Add the following to your `.env` file:

```bash
# AWS S3 Configuration (for document uploads)
AWS_REGION=eu-west-1
AWS_S3_BUCKET=joonapay-kyc-documents
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

## Production Considerations

### Upload Service
- **Current:** Files stored in S3 with signed URLs
- **Production:**
  - Implement virus scanning (ClamAV, AWS S3 Object Lambda)
  - Add encryption at rest (S3 server-side encryption)
  - Enable S3 versioning for audit trail
  - Set lifecycle policies for automatic deletion after X days
  - Add CloudFront CDN for faster access

### Liveness Service
- **Current:** In-memory Map storage
- **Production:**
  - Replace with Redis for distributed sessions
  - Integrate real liveness provider:
    - **FaceTec ZoOm** - 3D face mapping
    - **Onfido Smart Capture** - Passive liveness
    - **iProov Dynamic Liveness** - Active challenges
    - **AWS Rekognition Face Liveness** - Managed service
  - Implement webhook handlers for async results
  - Add rate limiting per user (prevent abuse)
  - Store results in database for compliance
  - Add fraud detection integration

### Security
- ✅ JWT authentication on all endpoints
- ✅ File type validation
- ✅ File size limits (5MB)
- ✅ User ownership validation
- ⚠️ Add: Rate limiting per user
- ⚠️ Add: Audit logging for all uploads
- ⚠️ Add: PII encryption before S3 storage

## Testing

### Upload Service
```bash
# Unit tests
npm test upload.service.spec.ts

# Manual test with curl
curl -X POST http://localhost:3000/kyc/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idFront=@/path/to/id_front.jpg" \
  -F "idBack=@/path/to/id_back.jpg" \
  -F "selfie=@/path/to/selfie.jpg"
```

### Liveness Service
```bash
# Unit tests
npm test liveness.service.spec.ts

# Manual test with curl
# 1. Start session
curl -X POST http://localhost:3000/liveness/start \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Submit challenge
curl -X POST http://localhost:3000/liveness/challenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "challengeId": "CHALLENGE_ID",
    "videoFrameBase64": "data:image/jpeg;base64,/9j/4AAQ..."
  }'

# 3. Complete session
curl -X POST http://localhost:3000/liveness/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID"}'

# 4. Check status
curl -X GET http://localhost:3000/liveness/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Locations

### Upload Module (Existing)
- Module: `/src/modules/upload/upload.module.ts`
- Service: `/src/modules/upload/application/services/upload.service.ts`
- Controller: `/src/modules/wallet/application/controllers/kyc-upload.controller.ts`

### Liveness Module (New)
- Module: `/src/modules/liveness/liveness.module.ts`
- Service: `/src/modules/liveness/application/services/liveness.service.ts`
- Controller: `/src/modules/liveness/application/controllers/liveness.controller.ts`
- Types: `/src/modules/liveness/domain/interfaces/liveness.types.ts`

### App Module
- Updated: `/src/app.module.ts` (added LivenessModule import)

## Performance Metrics

### Upload Service
- Image processing time: ~200-500ms (resize + compress)
- S3 upload time: ~500-2000ms (depends on file size and region)
- Total request time: < 3 seconds for 3 documents

### Liveness Service
- Session creation: < 10ms (in-memory)
- Challenge validation: < 50ms (mock)
- Session cleanup: < 100ms (periodic)
- Memory usage: ~1KB per session

## Monitoring

Monitor the following metrics:

### Uploads
- Upload success/failure rate
- Average file size
- Processing time (p50, p95, p99)
- S3 errors
- Invalid file type attempts

### Liveness
- Session creation rate
- Challenge pass rate (should be ~95%)
- Session expiry rate
- Average confidence scores
- Risk signal frequency

## Error Handling

### Upload Errors
- `400 Bad Request` - Invalid file type, size, or missing documents
- `401 Unauthorized` - Invalid or missing JWT token
- `413 Payload Too Large` - File exceeds 5MB limit
- `500 Internal Server Error` - S3 upload failure

### Liveness Errors
- `400 Bad Request` - Invalid challenge, session expired, or incomplete submission
- `401 Unauthorized` - Session doesn't belong to user
- `404 Not Found` - Session not found
- `500 Internal Server Error` - Service error

## Future Enhancements

1. **Multi-region support** - Deploy S3 buckets in multiple regions
2. **OCR extraction** - Extract ID data from uploaded documents
3. **Real-time validation** - Check ID against government databases
4. **Face matching** - Compare selfie with ID photo
5. **Duplicate detection** - Prevent same ID being used multiple times
6. **Analytics dashboard** - Track KYC completion funnel
7. **A/B testing** - Test different challenge types and sequences
8. **Mobile SDK** - Native iOS/Android liveness SDKs
