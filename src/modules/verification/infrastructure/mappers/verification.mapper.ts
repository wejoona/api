import { Injectable } from '@nestjs/common';
import {
  Verification,
  VerificationIdentifierType,
  VerificationStatus,
  VerificationType,
} from '../../domain/entities/verification.entity';
import {
  VerificationOrmEntity,
  VerificationIdentifierType as OrmIdentifierType,
  VerificationStatus as OrmStatus,
  VerificationType as OrmType,
} from '../orm-entities/verification.orm-entity';

@Injectable()
export class VerificationMapper {
  toDomain(entity: VerificationOrmEntity): Verification {
    return Verification.reconstitute({
      id: entity.id,
      userId: entity.userId,
      identifier: entity.identifier,
      identifierType:
        entity.identifierType as unknown as VerificationIdentifierType,
      type: entity.type as unknown as VerificationType,
      codeHash: entity.codeHash,
      attempts: entity.attempts,
      maxAttempts: entity.maxAttempts,
      status: entity.status as unknown as VerificationStatus,
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent,
      deviceFingerprint: entity.deviceFingerprint,
      metadata: entity.metadata,
      expiresAt: entity.expiresAt,
      verifiedAt: entity.verifiedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(verification: Verification): VerificationOrmEntity {
    const entity = new VerificationOrmEntity();
    entity.id = verification.id;
    entity.userId = verification.userId;
    entity.identifier = verification.identifier;
    entity.identifierType =
      verification.identifierType as unknown as OrmIdentifierType;
    entity.type = verification.type as unknown as OrmType;
    entity.codeHash = verification.codeHash;
    entity.attempts = verification.attempts;
    entity.maxAttempts = verification.maxAttempts;
    entity.status = verification.status as unknown as OrmStatus;
    entity.ipAddress = verification.ipAddress;
    entity.userAgent = verification.userAgent;
    entity.deviceFingerprint = verification.deviceFingerprint;
    entity.metadata = verification.metadata;
    entity.expiresAt = verification.expiresAt;
    entity.verifiedAt = verification.verifiedAt;
    return entity;
  }
}
