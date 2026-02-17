import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ConsentRepository } from '../../domain/repositories/consent.repository';
import { ConsentRecord } from '../../domain/entities/consent-record.entity';
import {
  ConsentType,
  KYC_REQUIRED_CONSENTS,
} from '../../domain/enums/consent-type.enum';

export interface GrantConsentInput {
  userId: string;
  consentType: ConsentType;
  ipAddress: string;
  userAgent?: string;
  version?: string;
}

export interface RevokeConsentInput {
  userId: string;
  consentType: ConsentType;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly consentRepository: ConsentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Grant consent for a specific type.
   * Creates an immutable audit record.
   */
  async grantConsent(input: GrantConsentInput): Promise<ConsentRecord> {
    // Check if already granted
    const existing = await this.consentRepository.findLatest(
      input.userId,
      input.consentType,
    );

    if (existing?.isActive()) {
      this.logger.debug(
        `Consent ${input.consentType} already active for user ${input.userId}`,
      );
      return existing;
    }

    const record = new ConsentRecord({
      id: uuidv4(),
      userId: input.userId,
      consentType: input.consentType,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent || null,
      version: input.version || '1.0',
      createdAt: new Date(),
    });

    const saved = await this.consentRepository.save(record);

    this.logger.log(
      `Consent granted: user=${input.userId} type=${input.consentType} version=${record.version}`,
    );

    // Emit event for audit trail
    this.eventEmitter.emit('consent.granted', {
      userId: input.userId,
      consentType: input.consentType,
      version: record.version,
      ipAddress: input.ipAddress,
      timestamp: record.grantedAt,
    });

    return saved;
  }

  /**
   * Revoke consent. Creates a new record with revocation timestamp.
   * Cannot revoke terms_of_service or privacy_policy (would disable the account).
   */
  async revokeConsent(input: RevokeConsentInput): Promise<ConsentRecord> {
    // Prevent revoking mandatory consents
    if (
      input.consentType === ConsentType.TERMS_OF_SERVICE ||
      input.consentType === ConsentType.PRIVACY_POLICY
    ) {
      throw new BadRequestException(
        `Cannot revoke ${input.consentType}. Please contact support to close your account.`,
      );
    }

    const existing = await this.consentRepository.findLatest(
      input.userId,
      input.consentType,
    );

    if (!existing || !existing.isActive()) {
      throw new BadRequestException(
        `No active consent of type ${input.consentType} to revoke`,
      );
    }

    const record = new ConsentRecord({
      id: uuidv4(),
      userId: input.userId,
      consentType: input.consentType,
      granted: false,
      grantedAt: existing.grantedAt,
      revokedAt: new Date(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent || null,
      version: existing.version,
      createdAt: new Date(),
    });

    const saved = await this.consentRepository.save(record);

    this.logger.log(
      `Consent revoked: user=${input.userId} type=${input.consentType}`,
    );

    this.eventEmitter.emit('consent.revoked', {
      userId: input.userId,
      consentType: input.consentType,
      ipAddress: input.ipAddress,
      timestamp: record.revokedAt,
    });

    return saved;
  }

  /**
   * Get current consent status for a user across all types.
   */
  async getConsentStatus(userId: string): Promise<{
    consents: Array<{
      consentType: ConsentType;
      granted: boolean;
      grantedAt: Date | null;
      revokedAt: Date | null;
      version: string;
    }>;
    kycReady: boolean;
  }> {
    const records = await this.consentRepository.findAllLatestByUser(userId);

    const consents = Object.values(ConsentType).map((type) => {
      const record = records.find((r) => r.consentType === type);
      return {
        consentType: type,
        granted: record?.isActive() ?? false,
        grantedAt: record?.grantedAt ?? null,
        revokedAt: record?.revokedAt ?? null,
        version: record?.version ?? '1.0',
      };
    });

    // Check if all KYC-required consents are granted
    const kycReady = KYC_REQUIRED_CONSENTS.every((requiredType) => {
      const consent = consents.find((c) => c.consentType === requiredType);
      return consent?.granted === true;
    });

    return { consents, kycReady };
  }

  /**
   * Get full consent history for a user.
   */
  async getConsentHistory(
    userId: string,
    consentType?: ConsentType,
    limit = 50,
    offset = 0,
  ) {
    return this.consentRepository.findHistory(
      userId,
      consentType,
      limit,
      offset,
    );
  }

  /**
   * Verify that all KYC-required consents are granted.
   * Throws ForbiddenException if not.
   * Called by KYC service before submission.
   */
  async verifyKycConsents(userId: string): Promise<void> {
    const { kycReady } = await this.getConsentStatus(userId);

    if (!kycReady) {
      const records =
        await this.consentRepository.findAllLatestByUser(userId);
      const missing = KYC_REQUIRED_CONSENTS.filter((required) => {
        const record = records.find((r) => r.consentType === required);
        return !record?.isActive();
      });

      throw new ForbiddenException(
        `KYC submission requires consent for: ${missing.join(', ')}. ` +
          `Please grant all required consents before submitting KYC documents.`,
      );
    }
  }
}
