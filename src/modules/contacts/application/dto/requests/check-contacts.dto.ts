import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMaxSize,
  Matches,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CONTACT_PERMISSION_STATUSES = [
  'granted',
  'limited',
  'denied',
  'unavailable',
] as const;

export type ContactPermissionStatus =
  (typeof CONTACT_PERMISSION_STATUSES)[number];

export class CheckContactsDto {
  @ApiProperty({
    description:
      'Optional mobile contact permission state. When denied or unavailable, clients should send no contact data.',
    enum: CONTACT_PERMISSION_STATUSES,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(CONTACT_PERMISSION_STATUSES)
  permissionStatus?: ContactPermissionStatus;

  @ApiProperty({
    description:
      'SHA-256 hashes of normalized E.164 phone numbers. Preferred for privacy-preserving lookup.',
    example: ['a'.repeat(64), 'b'.repeat(64)],
    maxItems: 500,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-fA-F0-9]{64}$/, { each: true })
  @ArrayMaxSize(500)
  phoneHashes?: string[];

  @ApiProperty({
    description:
      'Deprecated compatibility field. Phone numbers are hashed immediately and are not returned.',
    example: ['+2250701234567', '+221771234567'],
    maxItems: 500,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  phoneNumbers?: string[];
}
