import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SanitizeNote,
  SanitizeSingleLine,
} from '../../../../../common/decorators';

export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  // SECURITY: Sanitize filename to prevent path traversal and XSS
  @SanitizeSingleLine(255)
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  size: number;

  @IsString()
  @IsNotEmpty()
  url: string;
}

export class AddMessageDto {
  // SECURITY: Sanitize message to prevent stored XSS (OWASP A03:2021)
  @SanitizeNote(5000)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
