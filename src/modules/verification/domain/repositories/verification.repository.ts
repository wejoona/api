import {
  Verification,
  VerificationStatus,
  VerificationType,
} from '../entities/verification.entity';

export abstract class VerificationRepository {
  abstract findById(id: string): Promise<Verification | null>;

  abstract findByIdentifierAndType(
    identifier: string,
    type: VerificationType,
    status?: VerificationStatus,
  ): Promise<Verification | null>;

  abstract findPendingByIdentifier(
    identifier: string,
    type: VerificationType,
  ): Promise<Verification | null>;

  abstract findByUserId(
    userId: string,
    limit?: number,
  ): Promise<Verification[]>;

  abstract save(verification: Verification): Promise<Verification>;

  abstract expireOldVerifications(): Promise<number>;

  abstract deleteExpired(olderThanDays: number): Promise<number>;
}
