import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SanitizeSingleLine, SanitizeHtml } from '../../../../../common/decorators';

export class CreateContactDto {
  @ApiProperty({
    description: 'Contact display name',
    example: 'Amadou Diallo',
  })
  // SECURITY: Sanitize name to prevent stored XSS (OWASP A03:2021)
  @SanitizeSingleLine(100)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+2250701234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact wallet address',
    example: '0x1234567890abcdef...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  walletAddress?: string;

  @ApiPropertyOptional({
    description: 'Contact username (JoonaPay handle)',
    example: 'amadou_diallo',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().replace(/^@/, '') : value,
  )
  username?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({
    description: 'Contact display name',
    example: 'Amadou Diallo',
  })
  // SECURITY: Sanitize name to prevent stored XSS (OWASP A03:2021)
  @SanitizeSingleLine(100)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Mark as favorite',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

export class SearchContactsDto {
  @ApiProperty({
    description: 'Search query (name or username)',
    example: 'ama',
  })
  // SECURITY: Sanitize search query to prevent injection
  @SanitizeHtml({ maxLength: 50, htmlMode: 'strip' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query: string;
}
