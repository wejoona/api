import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ConfirmDepositDto {
  @ApiProperty({
    description: 'Encrypted token from initiate deposit response',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'OTP code for Orange Money (required for Orange)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value?.trim())
  otp?: string;
}