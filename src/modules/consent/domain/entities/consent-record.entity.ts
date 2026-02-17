import { ConsentType } from '../enums/consent-type.enum';

/**
 * Domain entity representing a single consent record.
 * Immutable log: grants and revocations are separate records.
 */
export class ConsentRecord {
  readonly id: string;
  readonly userId: string;
  readonly consentType: ConsentType;
  readonly granted: boolean;
  readonly grantedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly ipAddress: string;
  readonly userAgent: string | null;
  readonly version: string;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    grantedAt: Date | null;
    revokedAt: Date | null;
    ipAddress: string;
    userAgent: string | null;
    version: string;
    createdAt: Date;
  }) {
    Object.assign(this, props);
  }

  isActive(): boolean {
    return this.granted && this.revokedAt === null;
  }
}
