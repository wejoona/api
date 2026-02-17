/**
 * Types of consent that users can grant or revoke.
 * Each maps to a specific data-processing or communication purpose.
 */
export enum ConsentType {
  /** Consent to process personal data for KYC verification */
  KYC_DATA_PROCESSING = 'kyc_data_processing',

  /** Consent to share KYC data with third-party verification providers */
  KYC_DATA_SHARING = 'kyc_data_sharing',

  /** Consent to receive marketing communications */
  MARKETING = 'marketing',

  /** Acceptance of Terms of Service */
  TERMS_OF_SERVICE = 'terms_of_service',

  /** Acceptance of Privacy Policy */
  PRIVACY_POLICY = 'privacy_policy',

  /** Consent for AML/sanctions screening of personal data */
  AML_SCREENING = 'aml_screening',

  /** Consent for transaction monitoring and risk analysis */
  TRANSACTION_MONITORING = 'transaction_monitoring',
}

/** Consent types that MUST be granted before KYC submission */
export const KYC_REQUIRED_CONSENTS: ConsentType[] = [
  ConsentType.KYC_DATA_PROCESSING,
  ConsentType.KYC_DATA_SHARING,
  ConsentType.PRIVACY_POLICY,
  ConsentType.TERMS_OF_SERVICE,
  ConsentType.AML_SCREENING,
];
