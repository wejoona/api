import { ConsentRecord } from '../entities/consent-record.entity';
import { ConsentType } from '../enums/consent-type.enum';

/**
 * Abstract repository — infrastructure implements this.
 */
export abstract class ConsentRepository {
  abstract save(record: ConsentRecord): Promise<ConsentRecord>;

  /** Get the latest record for a specific user + consent type */
  abstract findLatest(
    userId: string,
    consentType: ConsentType,
  ): Promise<ConsentRecord | null>;

  /** Get all latest consent states for a user */
  abstract findAllLatestByUser(userId: string): Promise<ConsentRecord[]>;

  /** Full history for a user (optionally filtered by type) */
  abstract findHistory(
    userId: string,
    consentType?: ConsentType,
    limit?: number,
    offset?: number,
  ): Promise<{ records: ConsentRecord[]; total: number }>;
}
