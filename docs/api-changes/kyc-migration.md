# KYC API Migration Guide (v1 to v2)

This guide covers all changes to KYC (Know Your Customer) endpoints between API v1 and v2.

## Summary of Changes

| Aspect              | v1                        | v2                               |
|---------------------|---------------------------|----------------------------------|
| Status structure    | Flat object               | Nested with tier information     |
| Document keys       | Separate fields           | Nested `documents` object        |
| Limits              | Not included              | Included with tier details       |
| Verification info   | Basic                     | Detailed with provider info      |
| Requirements        | Not available             | New endpoint for requirements    |

## Endpoints

### GET /kyc/status

#### Response Changes

```typescript
// v1 Response
interface KycStatusV1 {
  status: 'not_started' | 'pending' | 'pending_verification' | 'approved' | 'rejected' | 'manual_review';
  score?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  canResubmit: boolean;
}

// v2 Response
interface KycStatusV2 {
  kyc: {
    id?: string;
    status: {
      code: 'not_started' | 'pending_documents' | 'pending_verification' | 'manual_review' | 'approved' | 'rejected' | 'expired';
      label: string;            // "Approved", "Pending Review"
      description?: string;     // Human-readable explanation
    };

    tier: {
      current: 0 | 1 | 2 | 3;
      name: string;             // "Unverified", "Basic", "Enhanced", "Premium"
      nextTier?: {
        level: number;
        requirements: string[];
      };
    };

    verification?: {
      method: 'auto' | 'manual';
      provider: string;         // "onfido", "jumio", "manual"
      score?: number;
      confidence?: string;      // "high", "medium", "low"
      completedAt?: string;
      reviewer?: string;        // For manual reviews
    };

    documents: {
      identity: {
        status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
        type?: string;          // "passport", "national_id", "drivers_license"
        rejectionReason?: string;
      };
      selfie: {
        status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
        matchScore?: number;
        rejectionReason?: string;
      };
      address?: {
        status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
        type?: string;
        rejectionReason?: string;
      };
    };

    limits: {
      daily: {
        deposit: number;        // In cents
        withdrawal: number;
        transfer: number;
      };
      monthly: {
        deposit: number;
        withdrawal: number;
        transfer: number;
      };
      perTransaction: {
        deposit: number;
        withdrawal: number;
        transfer: number;
      };
    };

    restrictions?: Array<{
      action: string;           // "external_transfer", "large_deposit"
      reason: string;
      canResolve: boolean;
      resolution?: string;
    }>;

    expiry?: {
      expiresAt: string;
      daysRemaining: number;
      renewalRequired: boolean;
    };

    timestamps: {
      created?: string;
      submitted?: string;
      verified?: string;
      rejected?: string;
      expiresAt?: string;
    };

    actions: {
      canSubmit: boolean;
      canResubmit: boolean;
      canUpgrade: boolean;
      canRenew: boolean;
    };

    nextSteps?: Array<{
      action: string;
      description: string;
      priority: 'required' | 'recommended' | 'optional';
    }>;
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function getKycStatusV1() {
  const response = await api.get('/kyc/status');
  const status = response.data;

  return {
    isVerified: status.status === 'approved',
    isPending: ['pending', 'pending_verification', 'manual_review'].includes(status.status),
    canResubmit: status.canResubmit,
    rejectionReason: status.rejectionReason,
  };
}

// After (v2)
async function getKycStatusV2() {
  const response = await api.get('/kyc/status');
  const { kyc } = response.data;

  return {
    // Status
    isVerified: kyc.status.code === 'approved',
    isPending: ['pending_documents', 'pending_verification', 'manual_review'].includes(kyc.status.code),
    statusLabel: kyc.status.label,
    statusDescription: kyc.status.description,

    // Tier information
    tier: kyc.tier.current,
    tierName: kyc.tier.name,
    upgradeRequirements: kyc.tier.nextTier?.requirements,

    // Document status
    documents: {
      identity: kyc.documents.identity.status,
      selfie: kyc.documents.selfie.status,
      identityRejectionReason: kyc.documents.identity.rejectionReason,
    },

    // Limits (convert from cents)
    limits: {
      dailyDeposit: kyc.limits.daily.deposit / 100,
      dailyWithdrawal: kyc.limits.daily.withdrawal / 100,
      dailyTransfer: kyc.limits.daily.transfer / 100,
      monthlyDeposit: kyc.limits.monthly.deposit / 100,
    },

    // Restrictions
    restrictions: kyc.restrictions || [],
    hasRestrictions: (kyc.restrictions?.length || 0) > 0,

    // Actions
    canSubmit: kyc.actions.canSubmit,
    canResubmit: kyc.actions.canResubmit,
    canUpgrade: kyc.actions.canUpgrade,

    // Next steps
    nextSteps: kyc.nextSteps || [],
    requiredSteps: kyc.nextSteps?.filter(s => s.priority === 'required') || [],
  };
}
```

### POST /kyc/submit

#### Request Changes

```typescript
// v1 Request
interface KycSubmitRequestV1 {
  firstName: string;
  lastName: string;
  dateOfBirth: string;        // "YYYY-MM-DD"
  country: string;            // ISO country code
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiryDate?: string;
  idFrontKey: string;         // S3 key
  idBackKey: string;
  selfieKey: string;
}

// v2 Request
interface KycSubmitRequestV2 {
  identity: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;      // "YYYY-MM-DD"
    nationality: string;      // ISO country code
    gender?: 'male' | 'female' | 'other';
  };

  address: {
    country: string;          // ISO country code
    state?: string;
    city: string;
    street: string;
    postalCode?: string;
  };

  document: {
    type: 'passport' | 'national_id' | 'drivers_license' | 'residence_permit';
    number: string;
    issuingCountry: string;
    issueDate?: string;
    expiryDate?: string;
  };

  documents: {
    idFront: string;          // S3 key or upload ID
    idBack?: string;          // Optional for passport
    selfie: string;
    proofOfAddress?: string;  // For tier 2+
  };

  consents: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    dataProcessingAccepted: boolean;
    timestamp: string;        // ISO date of consent
  };

  metadata?: {
    source?: string;          // "mobile_app", "web"
    ipAddress?: string;
    deviceId?: string;
  };
}
```

#### Response Changes

```typescript
// v1 Response
interface KycSubmitResponseV1 {
  id: string;
  status: string;
  message: string;
}

// v2 Response
interface KycSubmitResponseV2 {
  submission: {
    id: string;
    status: {
      code: 'pending_verification' | 'auto_approved' | 'manual_review';
      label: string;
    };
    estimatedReviewTime?: string;  // "Usually within 5 minutes"
    trackingUrl?: string;
  };

  verification: {
    method: 'auto' | 'manual';
    provider?: string;
    estimatedDuration: string;
  };

  tier: {
    current: number;
    afterApproval: number;
  };

  nextSteps: Array<{
    step: number;
    description: string;
    action?: string;          // "wait", "check_email", "upload_document"
  }>;

  limits: {
    current: object;
    afterApproval: object;
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function submitKycV1(data: KycFormData, documentKeys: DocumentKeys) {
  const response = await api.post('/kyc/submit', {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    country: data.country,
    idType: data.idType,
    idNumber: data.idNumber,
    idExpiryDate: data.idExpiryDate,
    idFrontKey: documentKeys.front,
    idBackKey: documentKeys.back,
    selfieKey: documentKeys.selfie,
  });

  return {
    submissionId: response.data.id,
    status: response.data.status,
    message: response.data.message,
  };
}

// After (v2)
async function submitKycV2(data: KycFormDataV2, documentKeys: DocumentKeysV2) {
  const response = await api.post('/kyc/submit', {
    identity: {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      gender: data.gender,
    },
    address: {
      country: data.country,
      state: data.state,
      city: data.city,
      street: data.street,
      postalCode: data.postalCode,
    },
    document: {
      type: data.idType,
      number: data.idNumber,
      issuingCountry: data.country,
      expiryDate: data.idExpiryDate,
    },
    documents: {
      idFront: documentKeys.front,
      idBack: documentKeys.back,
      selfie: documentKeys.selfie,
      proofOfAddress: documentKeys.proofOfAddress,
    },
    consents: {
      termsAccepted: true,
      privacyAccepted: true,
      dataProcessingAccepted: true,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      source: 'mobile_app',
      deviceId: getDeviceId(),
    },
  });

  const { submission, verification, tier, nextSteps, limits } = response.data;

  return {
    submissionId: submission.id,
    status: submission.status.code,
    statusLabel: submission.status.label,
    estimatedReviewTime: submission.estimatedReviewTime,

    // New: Verification details
    verificationMethod: verification.method,
    verificationProvider: verification.provider,

    // New: Tier progression
    currentTier: tier.current,
    tierAfterApproval: tier.afterApproval,

    // New: Next steps
    nextSteps: nextSteps,

    // New: Limits preview
    limitsAfterApproval: {
      dailyDeposit: limits.afterApproval.daily.deposit / 100,
      monthlyDeposit: limits.afterApproval.monthly.deposit / 100,
    },
  };
}
```

### POST /kyc/documents/upload (New in v2)

Upload documents directly with pre-signed URLs.

```typescript
// Step 1: Request upload URL
interface UploadRequestV2 {
  documentType: 'id_front' | 'id_back' | 'selfie' | 'proof_of_address';
  contentType: 'image/jpeg' | 'image/png' | 'application/pdf';
  fileSize: number;           // Bytes
}

interface UploadResponseV2 {
  upload: {
    id: string;
    url: string;              // Pre-signed S3 URL
    fields: Record<string, string>;  // Form fields for multipart upload
    expiresAt: string;
    maxSize: number;
  };
  documentKey: string;        // Use this in KYC submission
}

// Step 2: Upload file directly to S3
// Step 3: Use documentKey in POST /kyc/submit
```

### GET /kyc/requirements (New in v2)

Get KYC requirements based on user's country and desired tier.

```typescript
interface RequirementsRequestV2 {
  country: string;
  targetTier?: 1 | 2 | 3;
}

interface RequirementsResponseV2 {
  requirements: {
    country: string;
    tiers: Array<{
      level: 1 | 2 | 3;
      name: string;
      description: string;

      documents: Array<{
        type: string;
        required: boolean;
        description: string;
        acceptedFormats: string[];
        maxSize: number;
        guidelines: string[];
      }>;

      personalInfo: Array<{
        field: string;
        required: boolean;
        format?: string;
        validation?: string;
      }>;

      limits: {
        daily: number;
        monthly: number;
        perTransaction: number;
      };

      features: string[];     // ["external_transfers", "high_value_deposits"]
      processingTime: string; // "Usually within 5 minutes"
    }>;

    currentTier: number;
    recommendedTier: number;
  };

  acceptedDocuments: {
    identity: Array<{
      type: string;
      name: string;
      description: string;
    }>;
    proofOfAddress: Array<{
      type: string;
      name: string;
      maxAge: string;         // "3 months"
    }>;
  };
}
```

### GET /kyc/history (New in v2)

View KYC submission history.

```typescript
interface KycHistoryResponseV2 {
  submissions: Array<{
    id: string;
    status: string;
    tier: number;
    submittedAt: string;
    processedAt?: string;
    outcome?: 'approved' | 'rejected';
    rejectionReasons?: string[];
  }>;
}
```

## Tier System

### Tier Definitions

| Tier | Name       | Requirements                    | Daily Limit | Monthly Limit |
|------|------------|--------------------------------|-------------|---------------|
| 0    | Unverified | None                           | $0          | $0            |
| 1    | Basic      | Phone verification             | $500        | $2,000        |
| 2    | Enhanced   | ID + Selfie                    | $5,000      | $20,000       |
| 3    | Premium    | ID + Selfie + Proof of Address | $50,000     | $200,000      |

### Tier Progression

```typescript
// Check tier and upgrade path
async function checkTierProgressionV2() {
  const response = await api.get('/kyc/status');
  const { kyc } = response.data;

  const currentTier = kyc.tier.current;
  const nextTier = kyc.tier.nextTier;

  if (nextTier) {
    console.log(`Current tier: ${kyc.tier.name} (${currentTier})`);
    console.log(`To upgrade to tier ${nextTier.level}, you need:`);
    nextTier.requirements.forEach(req => console.log(`  - ${req}`));
  }

  return {
    currentTier,
    canUpgrade: kyc.actions.canUpgrade,
    upgradeRequirements: nextTier?.requirements || [],
  };
}
```

## Document Guidelines

### Accepted Documents by Type

```typescript
const ACCEPTED_DOCUMENTS = {
  identity: {
    passport: {
      required: ['front'],
      optional: [],
      guidelines: [
        'Must be valid and not expired',
        'Photo page must be clearly visible',
        'All text must be readable',
      ],
    },
    national_id: {
      required: ['front', 'back'],
      optional: [],
      guidelines: [
        'Must be valid and not expired',
        'Both sides required',
        'Photo must be clearly visible',
      ],
    },
    drivers_license: {
      required: ['front', 'back'],
      optional: [],
      guidelines: [
        'Must be valid and not expired',
        'Both sides required',
        'Address must be visible (if applicable)',
      ],
    },
  },
  proofOfAddress: {
    utility_bill: {
      maxAge: '3 months',
      guidelines: [
        'Must show name and address',
        'Must be dated within last 3 months',
      ],
    },
    bank_statement: {
      maxAge: '3 months',
      guidelines: [
        'Must show name and address',
        'Must be dated within last 3 months',
        'Account details can be redacted',
      ],
    },
  },
};
```

## Error Handling

### KYC Error Codes

| v1 Message                           | v2 Error Code                 |
|-------------------------------------|-------------------------------|
| "KYC already submitted"             | `KYC_ALREADY_SUBMITTED`       |
| "KYC already verified"              | `KYC_ALREADY_VERIFIED`        |
| "Cannot resubmit at this time"      | `KYC_RESUBMIT_NOT_ALLOWED`    |
| "Document expired"                  | `DOCUMENT_EXPIRED`            |
| "Document unreadable"               | `DOCUMENT_UNREADABLE`         |
| "Selfie does not match ID"          | `SELFIE_MISMATCH`             |
| "Invalid document type"             | `DOCUMENT_TYPE_INVALID`       |
| "Country not supported"             | `COUNTRY_NOT_SUPPORTED`       |
| "Age verification failed"           | `AGE_VERIFICATION_FAILED`     |

### Error Response Example

```json
{
  "error": {
    "code": "SELFIE_MISMATCH",
    "message": "The selfie does not match the photo on your ID",
    "details": {
      "matchScore": 45,
      "requiredScore": 70,
      "field": "selfie"
    },
    "hint": "Please ensure good lighting and that your face is clearly visible",
    "canResubmit": true,
    "resubmitFields": ["selfie"]
  },
  "requestId": "req_abc123",
  "timestamp": "2026-07-01T12:00:00Z"
}
```

## Handling KYC States

```typescript
// Complete KYC state machine handler
async function handleKycStateV2() {
  const response = await api.get('/kyc/status');
  const { kyc } = response.data;

  switch (kyc.status.code) {
    case 'not_started':
      // Show requirements and start KYC flow
      const requirements = await api.get('/kyc/requirements', {
        params: { country: userCountry, targetTier: 2 },
      });
      return showKycStartScreen(requirements.data);

    case 'pending_documents':
      // Resume incomplete submission
      return showDocumentUploadScreen(kyc.documents);

    case 'pending_verification':
      // Show waiting screen with ETA
      return showVerificationPendingScreen(kyc.verification);

    case 'manual_review':
      // Show extended waiting screen
      return showManualReviewScreen();

    case 'approved':
      // Show success and new limits
      return showKycApprovedScreen(kyc.tier, kyc.limits);

    case 'rejected':
      // Show rejection details and resubmit option
      return showRejectionScreen(
        kyc.documents,
        kyc.actions.canResubmit
      );

    case 'expired':
      // Prompt for renewal
      return showRenewalScreen(kyc.expiry);

    default:
      return showKycStatusScreen(kyc);
  }
}
```

## Checklist

- [ ] Update status parsing for nested structure
- [ ] Add tier information display
- [ ] Update document submission with new structure
- [ ] Implement consents tracking
- [ ] Add KYC requirements fetching
- [ ] Update error handling for new error codes
- [ ] Implement tier progression UI
- [ ] Add limits display based on tier
- [ ] Handle document-specific rejections
- [ ] Implement resubmission flow for rejected documents
- [ ] Add KYC expiry/renewal handling
