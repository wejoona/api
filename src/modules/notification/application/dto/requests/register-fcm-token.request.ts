import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PlatformType = 'ios' | 'android' | 'web';

/**
 * DTO for registering an FCM token
 */
export class RegisterFcmTokenRequest {
  @ApiProperty({
    description: 'FCM device token',
    example: 'eGVpVm9RaFlfLTRfZXhhbXBsZV90b2tlbl8xMjM0NTY3ODkw',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android', 'web'],
    example: 'android',
  })
  @IsEnum(['ios', 'android', 'web'])
  platform: PlatformType;

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'abc123def456',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Human-readable device name',
    example: 'Samsung Galaxy S24',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'App version string',
    example: '1.2.3',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: 'Android 14',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  osVersion?: string;
}

/**
 * DTO for removing an FCM token
 */
export class RemoveFcmTokenRequest {
  @ApiProperty({
    description: 'FCM device token to remove',
    example: 'eGVpVm9RaFlfLTRfZXhhbXBsZV90b2tlbl8xMjM0NTY3ODkw',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
