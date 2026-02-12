import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateOperationDto {
  @ApiProperty({
    description: 'Operation type',
    enum: ['pin_change', 'add_recipient', 'account_recovery', 'kyc_selfie', 'biometric_enroll', 'export_keys', 'delete_account'],
  })
  @IsString()
  @IsIn(['pin_change', 'add_recipient', 'account_recovery', 'kyc_selfie', 'biometric_enroll', 'export_keys', 'delete_account'])
  operation:
    | 'pin_change'
    | 'add_recipient'
    | 'account_recovery'
    | 'kyc_selfie'
    | 'biometric_enroll'
    | 'export_keys'
    | 'delete_account';

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
