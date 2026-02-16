import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssessSessionDto {
  @ApiProperty({ description: 'Device fingerprint identifier' })
  @IsString()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Geo-location data' })
  @IsOptional()
  @IsObject()
  geoLocation?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'App version string' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
