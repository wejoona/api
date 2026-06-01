import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+2250701234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +2250701234567)',
  })
  phone: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'CI',
    required: false,
    default: 'CI',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Country code must be an uppercase ISO 3166-1 alpha-2 code',
  })
  countryCode?: string;
}
