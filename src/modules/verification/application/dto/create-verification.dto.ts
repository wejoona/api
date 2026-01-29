import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import {
  VerificationIdentifierType,
  VerificationType,
} from '../../domain/entities/verification.entity';

export class CreateVerificationDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsOptional()
  @IsEnum(VerificationIdentifierType)
  identifierType?: VerificationIdentifierType;

  @IsEnum(VerificationType)
  type: VerificationType;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  expiresInSeconds?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class VerifyCodeDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsEnum(VerificationType)
  type: VerificationType;

  @IsString()
  @IsNotEmpty()
  code: string;
}
