import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmDepositDto {
  @ApiProperty({
    description: 'Encrypted deposit token from initiate response',
    example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'OTP code (required for OTP payment methods)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  otp?: string; // required for OTP type
}