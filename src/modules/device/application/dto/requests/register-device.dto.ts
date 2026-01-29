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
    description: 'Additional device metadata',
    example: { screenSize: '6.1 inches', batteryLevel: 85 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
