import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '../../domain/enums/consent-type.enum';

export class GrantConsentDto {
  @ApiProperty({
    enum: ConsentType,
    description: 'Type of consent being granted',
    example: ConsentType.KYC_DATA_PROCESSING,
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiPropertyOptional({
    description: 'Policy/terms version the user is consenting to',
    example: '1.0',
  })
  @IsOptional()
  @IsString()
  version?: string;
}
