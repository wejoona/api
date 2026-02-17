import { ApiProperty } from '@nestjs/swagger';
import { ConsentType } from '../../domain/enums/consent-type.enum';

export class ConsentStatusItemDto {
  @ApiProperty({ enum: ConsentType })
  consentType: ConsentType;

  @ApiProperty()
  granted: boolean;

  @ApiProperty({ nullable: true })
  grantedAt: Date | null;

  @ApiProperty({ nullable: true })
  revokedAt: Date | null;

  @ApiProperty()
  version: string;
}

export class ConsentStatusResponseDto {
  @ApiProperty({ type: [ConsentStatusItemDto] })
  consents: ConsentStatusItemDto[];

  @ApiProperty({ description: 'Whether all KYC-required consents are granted' })
  kycReady: boolean;
}

export class ConsentHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ConsentType })
  consentType: ConsentType;

  @ApiProperty()
  granted: boolean;

  @ApiProperty({ nullable: true })
  grantedAt: Date | null;

  @ApiProperty({ nullable: true })
  revokedAt: Date | null;

  @ApiProperty()
  version: string;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConsentHistoryResponseDto {
  @ApiProperty({ type: [ConsentHistoryItemDto] })
  records: ConsentHistoryItemDto[];

  @ApiProperty()
  total: number;
}
