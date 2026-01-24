import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceTokenRequest {
  @ApiProperty({
    description: 'Device push notification token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android', 'web'],
    example: 'ios',
  })
  @IsEnum(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'ABC123-DEF456-GHI789',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Human-readable device name',
    example: "John's iPhone 15 Pro",
  })
  @IsString()
  @IsOptional()
  deviceName?: string;
}
