import { setup, assign } from 'xstate';

/**
 * KYC Verification States
 */
export type KycState =
  | 'none'
  | 'documents_pending'
  | 'documents_uploaded'
  | 'pending_document_verification'
  | 'pending_liveness_check'
  | 'pending_identity_verification'
  | 'auto_approved'
  | 'manual_review'
  | 'approved'
  | 'rejected'
  | 'complete';

/**
 * KYC FSM Context
 */
export interface KycContext {
  // Entity identifiers
  entityId: string;
  entityType: string;
  userId: string;

  // Personal information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;

  // Document information
  idType?: string;
  idNumber?: string;
  documentFrontKey?: string;
  documentBackKey?: string;
  selfieKey?: string;

  // Verification scores (0-100)
  documentVerificationScore?: number;
  livenessScore?: number;
  identityScore?: number;
  overallScore?: number;

  // Provider references
  documentVerificationId?: string;
  livenessCheckId?: string;
  identityVerificationId?: string;

  // Provider names used
  documentProvider?: string;
  livenessProvider?: string;
  identityProvider?: string;

  // Review data
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;

  // Attempt tracking
  attempts: number;
  maxAttempts: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  verifiedAt?: Date;
  approvedAt?: Date;
}

/**
 * KYC FSM Events
 */
export type KycEvent =
  | { type: 'REGISTER'; userId: string }
  | {
      type: 'UPLOAD_DOCUMENTS';
      documentFrontKey: string;
      documentBackKey: string;
      selfieKey: string;
      personalInfo: {
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        country: string;
        idType: string;
        idNumber: string;
      };
    }
  | { type: 'SUBMIT_FOR_VERIFICATION' }
  | {
      type: 'DOCUMENT_VERIFICATION_COMPLETE';
      score: number;
      verificationId: string;
      provider: string;
    }
  | {
      type: 'LIVENESS_CHECK_COMPLETE';
      score: number;
      verificationId: string;
      provider: string;
      isLive: boolean;
    }
  | {
      type: 'IDENTITY_VERIFICATION_COMPLETE';
      score: number;
      verificationId: string;
      provider: string;
    }
  | { type: 'VERIFICATION_FAILED'; reason: string }
  | { type: 'ADMIN_APPROVE'; adminId: string; notes?: string }
  | { type: 'ADMIN_REJECT'; adminId: string; reason: string }
  | { type: 'RESUBMIT' }
  | { type: 'WALLET_CREATED' };

/**
 * Score thresholds
 */
const THRESHOLDS = {
  AUTO_APPROVE: 80,
  AUTO_REJECT: 40,
  DOCUMENT_MIN: 70,
  LIVENESS_MIN: 80,
  IDENTITY_MIN: 70,
};

/**
 * Calculate overall score from individual scores
 */
function calculateOverallScore(context: KycContext): number {
  const scores = [
    context.documentVerificationScore,
    context.livenessScore,
    context.identityScore,
  ].filter((s): s is number => s !== undefined);

  if (scores.length === 0) return 0;

  // Weighted average: liveness 40%, document 30%, identity 30%
  const weights = { document: 0.3, liveness: 0.4, identity: 0.3 };

  let weightedSum = 0;
  let totalWeight = 0;

  if (context.documentVerificationScore !== undefined) {
    weightedSum += context.documentVerificationScore * weights.document;
    totalWeight += weights.document;
  }
  if (context.livenessScore !== undefined) {
    weightedSum += context.livenessScore * weights.liveness;
    totalWeight += weights.liveness;
  }
  if (context.identityScore !== undefined) {
    weightedSum += context.identityScore * weights.identity;
    totalWeight += weights.identity;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * KYC Verification State Machine
 *
 * Flow:
 * 1. NONE → DOCUMENTS_PENDING (on registration)
 * 2. DOCUMENTS_PENDING → DOCUMENTS_UPLOADED (on document upload)
 * 3. DOCUMENTS_UPLOADED → PENDING_DOCUMENT_VERIFICATION (on submit)
 * 4. Run verifications in sequence: Document → Liveness → Identity
 * 5. Based on scores: AUTO_APPROVED / MANUAL_REVIEW / REJECTED
 * 6. APPROVED → COMPLETE (after wallet created)
 */
export const kycMachine = setup({
  types: {
    context: {} as KycContext,
    events: {} as KycEvent,
  },
  guards: {
    documentCheckFailed: ({ event }) => {
      if (event.type !== 'DOCUMENT_VERIFICATION_COMPLETE') return false;
      return event.score < THRESHOLDS.DOCUMENT_MIN;
    },
    livenessCheckFailed: ({ event }) => {
      if (event.type !== 'LIVENESS_CHECK_COMPLETE') return false;
      return !event.isLive || event.score < THRESHOLDS.LIVENESS_MIN;
    },
    shouldAutoApprove: ({ context, event }) => {
      if (event.type !== 'IDENTITY_VERIFICATION_COMPLETE') return false;
      const overall = calculateOverallScore({
        ...context,
        identityScore: event.score,
      });
      return overall >= THRESHOLDS.AUTO_APPROVE;
    },
    shouldAutoReject: ({ context, event }) => {
      if (event.type !== 'IDENTITY_VERIFICATION_COMPLETE') return false;
      const overall = calculateOverallScore({
        ...context,
        identityScore: event.score,
      });
      return overall < THRESHOLDS.AUTO_REJECT;
    },
    canResubmit: ({ context }) => context.attempts < context.maxAttempts,
  },
  actions: {
    emitKycApproved: () => {
      // Handled by FSM service
    },
    emitKycRejected: () => {
      // Handled by FSM service
    },
    emitKycComplete: () => {
      // Handled by FSM service
    },
  },
}).createMachine({
  id: 'kyc',
  initial: 'none',
  context: {
    entityId: '',
    entityType: 'kyc',
    userId: '',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  states: {
    // Initial state - no KYC started
    none: {
      on: {
        REGISTER: {
          target: 'documents_pending',
          actions: assign({
            userId: ({ event }) => event.userId,
            createdAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Waiting for user to upload documents
    documents_pending: {
      on: {
        UPLOAD_DOCUMENTS: {
          target: 'documents_uploaded',
          actions: assign({
            documentFrontKey: ({ event }) => event.documentFrontKey,
            documentBackKey: ({ event }) => event.documentBackKey,
            selfieKey: ({ event }) => event.selfieKey,
            firstName: ({ event }) => event.personalInfo.firstName,
            lastName: ({ event }) => event.personalInfo.lastName,
            dateOfBirth: ({ event }) => event.personalInfo.dateOfBirth,
            country: ({ event }) => event.personalInfo.country,
            idType: ({ event }) => event.personalInfo.idType,
            idNumber: ({ event }) => event.personalInfo.idNumber,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Documents uploaded, ready for submission
    documents_uploaded: {
      on: {
        SUBMIT_FOR_VERIFICATION: {
          target: 'pending_document_verification',
          actions: assign({
            attempts: ({ context }) => context.attempts + 1,
            submittedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        // Allow re-upload before submission
        UPLOAD_DOCUMENTS: {
          target: 'documents_uploaded',
          actions: assign({
            documentFrontKey: ({ event }) => event.documentFrontKey,
            documentBackKey: ({ event }) => event.documentBackKey,
            selfieKey: ({ event }) => event.selfieKey,
            firstName: ({ event }) => event.personalInfo.firstName,
            lastName: ({ event }) => event.personalInfo.lastName,
            dateOfBirth: ({ event }) => event.personalInfo.dateOfBirth,
            country: ({ event }) => event.personalInfo.country,
            idType: ({ event }) => event.personalInfo.idType,
            idNumber: ({ event }) => event.personalInfo.idNumber,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Step 1: Document verification in progress
    pending_document_verification: {
      on: {
        DOCUMENT_VERIFICATION_COMPLETE: [
          {
            // Document check failed - reject immediately
            target: 'rejected',
            guard: 'documentCheckFailed',
            actions: assign({
              documentVerificationScore: ({ event }) => event.score,
              documentVerificationId: ({ event }) => event.verificationId,
              documentProvider: ({ event }) => event.provider,
              rejectionReason: () =>
                'Document verification failed. Please ensure your documents are clear and valid.',
              updatedAt: () => new Date(),
            }),
          },
          {
            // Document check passed - proceed to liveness
            target: 'pending_liveness_check',
            actions: assign({
              documentVerificationScore: ({ event }) => event.score,
              documentVerificationId: ({ event }) => event.verificationId,
              documentProvider: ({ event }) => event.provider,
              updatedAt: () => new Date(),
            }),
          },
        ],
        VERIFICATION_FAILED: {
          target: 'rejected',
          actions: assign({
            rejectionReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Step 2: Liveness check in progress
    pending_liveness_check: {
      on: {
        LIVENESS_CHECK_COMPLETE: [
          {
            // Liveness failed - reject
            target: 'rejected',
            guard: 'livenessCheckFailed',
            actions: assign({
              livenessScore: ({ event }) => event.score,
              livenessCheckId: ({ event }) => event.verificationId,
              livenessProvider: ({ event }) => event.provider,
              rejectionReason: () =>
                'Liveness check failed. Please ensure you are in good lighting and follow the instructions.',
              updatedAt: () => new Date(),
            }),
          },
          {
            // Liveness passed - proceed to identity verification
            target: 'pending_identity_verification',
            actions: assign({
              livenessScore: ({ event }) => event.score,
              livenessCheckId: ({ event }) => event.verificationId,
              livenessProvider: ({ event }) => event.provider,
              updatedAt: () => new Date(),
            }),
          },
        ],
        VERIFICATION_FAILED: {
          target: 'rejected',
          actions: assign({
            rejectionReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Step 3: Identity verification (face match + data validation)
    pending_identity_verification: {
      on: {
        IDENTITY_VERIFICATION_COMPLETE: [
          {
            // All verifications complete - check overall score for auto-approve
            target: 'auto_approved',
            guard: 'shouldAutoApprove',
            actions: assign({
              identityScore: ({ event }) => event.score,
              identityVerificationId: ({ event }) => event.verificationId,
              identityProvider: ({ event }) => event.provider,
              overallScore: ({ context, event }) =>
                calculateOverallScore({
                  ...context,
                  identityScore: event.score,
                }),
              verifiedAt: () => new Date(),
              updatedAt: () => new Date(),
            }),
          },
          {
            // Score too low - auto reject
            target: 'rejected',
            guard: 'shouldAutoReject',
            actions: assign({
              identityScore: ({ event }) => event.score,
              identityVerificationId: ({ event }) => event.verificationId,
              identityProvider: ({ event }) => event.provider,
              overallScore: ({ context, event }) =>
                calculateOverallScore({
                  ...context,
                  identityScore: event.score,
                }),
              rejectionReason: () =>
                'Identity verification failed. The information provided does not match our records.',
              updatedAt: () => new Date(),
            }),
          },
          {
            // Middle score - needs manual review
            target: 'manual_review',
            actions: assign({
              identityScore: ({ event }) => event.score,
              identityVerificationId: ({ event }) => event.verificationId,
              identityProvider: ({ event }) => event.provider,
              overallScore: ({ context, event }) =>
                calculateOverallScore({
                  ...context,
                  identityScore: event.score,
                }),
              verifiedAt: () => new Date(),
              updatedAt: () => new Date(),
            }),
          },
        ],
        VERIFICATION_FAILED: {
          target: 'rejected',
          actions: assign({
            rejectionReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Auto-approved - transitions immediately to approved
    auto_approved: {
      always: {
        target: 'approved',
        actions: assign({
          approvedAt: () => new Date(),
          updatedAt: () => new Date(),
        }),
      },
    },

    // Needs manual review by admin
    manual_review: {
      on: {
        ADMIN_APPROVE: {
          target: 'approved',
          actions: assign({
            reviewedBy: ({ event }) => event.adminId,
            reviewNotes: ({ event }) => event.notes,
            approvedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        ADMIN_REJECT: {
          target: 'rejected',
          actions: assign({
            reviewedBy: ({ event }) => event.adminId,
            rejectionReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // KYC approved - waiting for wallet creation
    approved: {
      entry: 'emitKycApproved',
      on: {
        WALLET_CREATED: {
          target: 'complete',
          actions: assign({
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // KYC rejected - can resubmit if attempts remaining
    rejected: {
      entry: 'emitKycRejected',
      on: {
        RESUBMIT: {
          target: 'documents_pending',
          guard: 'canResubmit',
          actions: assign({
            // Clear previous verification data
            documentVerificationScore: () => undefined,
            livenessScore: () => undefined,
            identityScore: () => undefined,
            overallScore: () => undefined,
            documentVerificationId: () => undefined,
            livenessCheckId: () => undefined,
            identityVerificationId: () => undefined,
            rejectionReason: () => undefined,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Final state - KYC complete and wallet created
    complete: {
      type: 'final',
      entry: 'emitKycComplete',
    },
  },
});

export type KycMachine = typeof kycMachine;
