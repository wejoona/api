import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalDocumentDto {
  @ApiProperty({ description: 'Unique document identifier' })
  id: string;

  @ApiProperty({
    description: 'Document type',
    enum: ['terms_of_service', 'privacy_policy', 'cookie_policy'],
  })
  type: 'terms_of_service' | 'privacy_policy' | 'cookie_policy';

  @ApiProperty({ description: 'Semantic version (e.g., 1.2.0)' })
  version: string;

  @ApiProperty({ description: 'Document title' })
  title: string;

  @ApiProperty({ description: 'Plain text content' })
  content: string;

  @ApiProperty({ description: 'HTML formatted content' })
  content_html: string;

  @ApiProperty({ description: 'Date when the document becomes effective' })
  effective_date: string;

  @ApiPropertyOptional({ description: 'Date of last update' })
  last_updated?: string;

  @ApiPropertyOptional({ description: 'Summary of recent changes' })
  summary?: string;

  @ApiProperty({ description: 'Document locale (e.g., en, fr)' })
  locale: string;
}

export class LegalConsentDto {
  @ApiProperty({ description: 'Document ID that was consented to' })
  @IsString()
  document_id: string;

  @ApiProperty({ description: 'Document version that was consented to' })
  @IsString()
  document_version: string;

  @ApiProperty({
    description: 'Document type',
    enum: ['terms_of_service', 'privacy_policy', 'cookie_policy'],
  })
  @IsEnum(['terms_of_service', 'privacy_policy', 'cookie_policy'])
  document_type: 'terms_of_service' | 'privacy_policy' | 'cookie_policy';

  @ApiProperty({ description: 'Timestamp of consent' })
  @IsDateString()
  consented_at: string;

  @ApiPropertyOptional({ description: 'IP address at time of consent' })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  device_id?: string;
}

export class GetLegalDocumentQueryDto {
  @ApiPropertyOptional({
    description: 'Locale for document (default: en)',
    default: 'en',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
