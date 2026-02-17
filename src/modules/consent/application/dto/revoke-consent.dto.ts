import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConsentType } from '../../domain/enums/consent-type.enum';

export class RevokeConsentDto {
  @ApiProperty({
    enum: ConsentType,
    description: 'Type of consent being revoked',
    example: ConsentType.MARKETING,
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;
}
