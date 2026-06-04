import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '../../../domain/entities/device.entity';

/**
 * Device Response DTO
 *
 * Response data for device information
 */
export class DeviceResponseDto {
  @ApiProperty({
    description: 'Device unique identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Owner user identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Device fingerprint/identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  deviceIdentifier: string;

  @ApiProperty({
    description: 'Human-readable device display name',
    example: 'Samsung Galaxy S23',
  })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Device brand',
    example: 'Samsung',
    nullable: true,
  })
  brand: string | null;

  @ApiPropertyOptional({
    description: 'Device model',
    example: 'Galaxy S23',
    nullable: true,
  })
  model: string | null;

  @ApiPropertyOptional({
    description: 'Operating system',
    example: 'Android',
    nullable: true,
  })
  os: string | null;

  @ApiPropertyOptional({
    description: 'OS version',
    example: '13.0',
    nullable: true,
  })
  osVersion: string | null;

  @ApiPropertyOptional({
    description: 'Application version last reported by this device',
    example: '1.2.3',
    nullable: true,
  })
  appVersion: string | null;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Whether the device is trusted (no OTP required)',
    example: true,
  })
  isTrusted: boolean;

  @ApiPropertyOptional({
    description: 'When the device was trusted',
    example: '2024-01-29T10:30:00.000Z',
    nullable: true,
  })
  trustedAt: Date | null;

  @ApiProperty({
    description: 'Whether the device is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-29T15:45:30.000Z',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @ApiPropertyOptional({
    description: 'Last IP address used',
    example: '192.168.1.100',
    nullable: true,
  })
  lastIpAddress: string | null;

  @ApiProperty({
    description: 'Number of times logged in from this device',
    example: 42,
  })
  loginCount: number;

  @ApiProperty({
    description: 'When the device was first registered',
    example: '2024-01-15T08:20:00.000Z',
  })
  createdAt: Date;
}
