import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsEmail,
  IsUrl,
  Matches,
} from 'class-validator';
import { MerchantCategory, MERCHANT_CATEGORIES } from '../../../domain/entities/merchant.types';

export class RegisterMerchantDto {
  @ApiProperty({
    description: 'Legal business name',
    example: 'Cafe Abidjan SARL',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  businessName: string;

  @ApiPropertyOptional({
    description: 'Display name shown to customers',
    example: 'Cafe Abidjan',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @ApiProperty({
    description: 'Business category',
    enum: MERCHANT_CATEGORIES,
    example: 'restaurant',
  })
  @IsEnum(MERCHANT_CATEGORIES)
  category: MerchantCategory;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'CI',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  country: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: 'Rue du Commerce, Plateau, Abidjan',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Business phone number',
    example: '+2250700000000',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format',
  })
  businessPhone?: string;

  @ApiPropertyOptional({
    description: 'Business email address',
    example: 'contact@cafeabidjan.ci',
  })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({
    description: 'Tax identification number',
    example: 'CI-123456789',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL for payment notifications',
    example: 'https://cafeabidjan.ci/webhooks/joonapay',
  })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;
}
