/**
 * Transaction limits by KYC level.
 * All amounts in USDC equivalent.
 */
export const TRANSACTION_LIMITS = {
  /** Unverified users (pending KYC) */
  PENDING: {
    dailyLimit: 50,
    monthlyLimit: 200,
    perTransactionLimit: 25,
    dailyTransactionCount: 3,
  },
  /** Basic KYC (ID verified) */
  BASIC: {
    dailyLimit: 500,
    monthlyLimit: 5000,
    perTransactionLimit: 250,
    dailyTransactionCount: 20,
  },
  /** Full KYC (ID + address + selfie) */
  FULL: {
    dailyLimit: 5000,
    monthlyLimit: 50000,
    perTransactionLimit: 2500,
    dailyTransactionCount: 100,
  },
  /** Business accounts */
  BUSINESS: {
    dailyLimit: 50000,
    monthlyLimit: 500000,
    perTransactionLimit: 25000,
    dailyTransactionCount: 500,
  },
} as const;

export type KycLevel = keyof typeof TRANSACTION_LIMITS;

/** Get limits for a KYC status */
export function getLimitsForKycStatus(kycStatus: string): typeof TRANSACTION_LIMITS[KycLevel] {
  switch (kycStatus.toLowerCase()) {
    case 'approved': return TRANSACTION_LIMITS.FULL;
    case 'submitted':
    case 'manual_review': return TRANSACTION_LIMITS.BASIC;
    default: return TRANSACTION_LIMITS.PENDING;
  }
}
