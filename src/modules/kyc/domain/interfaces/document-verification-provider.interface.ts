/**
 * Document Verification Provider Interface
 *
 * Provides abstraction for document verification services.
 * Implementations: Onfido, Jumio, Veriff, Smile Identity, Mock
 */

export const DOCUMENT_VERIFICATION_PROVIDER = Symbol(
  'DOCUMENT_VERIFICATION_PROVIDER',
);

/**
 * Supported document types
 */
export type DocumentType =
  | 'passport'
  | 'national_id'
  | 'drivers_license'
  | 'residence_permit'
  | 'voter_id';

/**
 * Document side
 */
export type DocumentSide = 'front' | 'back';

/**
 * Input for document verification
 */
export interface VerifyDocumentInput {
  /** Unique ID for this verification request */
  requestId: string;

  /** User ID in our system */
  userId: string;

  /** Type of document being verified */
  documentType: DocumentType;

  /** URLs to document images (signed URLs or base64) */
  documentFrontUrl: string;
  documentBackUrl?: string; // Not all documents have back

  /** Country of document issuance (ISO 3166-1 alpha-2) */
  issuingCountry: string;

  /** Expected data for validation (optional) */
  expectedData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
  };

  /** Webhook URL for async results */
  webhookUrl?: string;
}

/**
 * Extracted data from document
 */
export interface ExtractedDocumentData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  dateOfBirth?: string;
  documentNumber?: string;
  expiryDate?: string;
  issueDate?: string;
  issuingCountry?: string;
  nationality?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  mrz?: string; // Machine Readable Zone for passports
}

/**
 * Individual check result
 */
export interface DocumentCheck {
  name: string;
  passed: boolean;
  score?: number;
  details?: string;
  rawResult?: Record<string, unknown>;
}

/**
 * Document verification result
 */
export interface DocumentVerificationResult {
  /** Provider's verification ID */
  verificationId: string;

  /** Overall status */
  status: 'passed' | 'failed' | 'review' | 'pending' | 'error';

  /** Overall confidence score (0-100) */
  score: number;

  /** Extracted data from document */
  extractedData?: ExtractedDocumentData;

  /** Individual check results */
  checks: {
    /** Is the document authentic (not forged/tampered)? */
    authenticity?: DocumentCheck;

    /** Is the document expired? */
    expiry?: DocumentCheck;

    /** Can we read all required fields? */
    readability?: DocumentCheck;

    /** Does data match expected values? */
    dataMatch?: DocumentCheck;

    /** Is the document on any watchlists? */
    watchlist?: DocumentCheck;

    /** Is the document quality acceptable? */
    imageQuality?: DocumentCheck;

    /** Additional provider-specific checks */
    [key: string]: DocumentCheck | undefined;
  };

  /** Data mismatches found */
  mismatches?: Array<{
    field: string;
    expected?: string;
    found?: string;
  }>;

  /** Warnings (not failures) */
  warnings?: string[];

  /** Error message if status is 'error' */
  errorMessage?: string;

  /** Provider name */
  provider: string;

  /** Raw response from provider */
  rawResponse?: Record<string, unknown>;

  /** When verification was completed */
  completedAt: Date;
}

/**
 * Document Verification Provider Interface
 */
export interface IDocumentVerificationProvider {
  /**
   * Provider name for identification
   */
  readonly providerName: string;

  /**
   * Supported document types
   */
  readonly supportedDocuments: DocumentType[];

  /**
   * Supported countries (ISO 3166-1 alpha-2)
   */
  readonly supportedCountries: string[];

  /**
   * Verify a document
   *
   * @param input - Document verification input
   * @returns Verification result
   */
  verifyDocument(
    input: VerifyDocumentInput,
  ): Promise<DocumentVerificationResult>;

  /**
   * Get status of a pending verification
   *
   * @param verificationId - Provider's verification ID
   * @returns Current verification result
   */
  getVerificationStatus(
    verificationId: string,
  ): Promise<DocumentVerificationResult>;

  /**
   * Validate webhook signature
   *
   * @param payload - Raw webhook payload
   * @param signature - Signature header value
   * @returns Whether signature is valid
   */
  validateWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload into verification result
   *
   * @param payload - Parsed webhook payload
   * @returns Verification result
   */
  parseWebhookPayload(
    payload: Record<string, unknown>,
  ): DocumentVerificationResult;
}
