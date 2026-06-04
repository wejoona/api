import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsBoolean,
  Matches,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  SanitizeSingleLine,
  SanitizeHtml,
} from '../../../../../common/decorators';

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

export class SyncContactsDto {
  @ApiProperty({
    description: 'Array of SHA-256 hashed phone numbers for privacy',
    example: [
      'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      'b3a8e0e1f9ab1bfe3a36f231f676f78bb30a519d2b21e6c530c0eee8ebb4a5d0',
    ],
    type: [String],
    maxItems: 500,
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @Matches(/^[a-fA-F0-9]{64}$/, { each: true })
  @ArrayMaxSize(500)
  phoneHashes: string[];
}

export class InviteContactDto {
  @ApiProperty({
    description: 'Phone number to invite',
    example: '+2250701234567',
  })
  @IsString()
  @MaxLength(20)
  phone: string;
}
