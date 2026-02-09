import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { DevicePlatform } from '../../../domain/entities/device.entity';

/**
 * Register Device DTO
 *
 * Request body for registering or updating a device
 */
export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique device identifier (device fingerprint or UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @ApiPropertyOptional({
    description: 'Device brand/manufacturer',
    example: 'Samsung',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Device model',
    example: 'Galaxy S23',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Operating system name',
    example: 'Android',
  })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: '13.0',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'App version',
    example: '1.2.3',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @ApiPropertyOptional({
    description: 'Firebase Cloud Messaging token for push notifications',
    example: 'dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx...',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({
    description:
      'Device ECDH P-256 public key in JWK format for JWS/JWE operations',
    example: {
      kty: 'EC',
      crv: 'P-256',
      x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
      y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
    },
  })
  @IsOptional()
  @IsObject()
  publicKeyJwk?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Human-readable device name',
    example: "Ben's iPhone 15",
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Additional device metadata',
    example: { screenSize: '6.1 inches', batteryLevel: 85 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
