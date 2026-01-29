import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
} from '../../../domain/entities/support-ticket.entity';
import { SanitizeHtml, SanitizeNote } from '../../../../../common/decorators';

export class CreateTicketDto {
  // SECURITY: Sanitize subject to prevent stored XSS (OWASP A03:2021)
  @SanitizeHtml({ maxLength: 255, preserveNewlines: false })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  subject!: string;

  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  // SECURITY: Sanitize message to prevent stored XSS (OWASP A03:2021)
  @SanitizeNote(5000)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}
