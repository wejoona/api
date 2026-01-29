import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SanitizeSingleLine } from '../../../../../common/decorators';

export class UpdateProfileDto {
  @ApiProperty({
    description:
      'Unique username/handle (3-20 chars, alphanumeric and underscores only)',
    example: 'amadou_diallo',
    required: false,
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

  @ApiProperty({
    description: 'User first name',
    example: 'Amadou',
    required: false,
  })
  // SECURITY: Sanitize name to prevent stored XSS (OWASP A03:2021)
  @SanitizeSingleLine(100)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Diallo',
    required: false,
  })
  // SECURITY: Sanitize name to prevent stored XSS (OWASP A03:2021)
  @SanitizeSingleLine(100)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'amadou@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
