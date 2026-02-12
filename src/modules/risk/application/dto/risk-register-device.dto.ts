import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RiskRegisterDeviceDto {
  @ApiProperty({ description: 'Device unique identifier', example: 'device-abc-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Device platform', enum: ['ios', 'android', 'web'], example: 'ios' })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({ description: 'OS version', example: '17.2' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ description: 'App version', example: '1.5.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Whether device is an emulator' })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;

  @ApiPropertyOptional({ description: 'Whether device is rooted/jailbroken' })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;
}
