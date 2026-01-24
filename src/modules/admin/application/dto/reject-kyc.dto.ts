import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectKycDto {
  @ApiProperty({
    description: 'Reason for rejecting the KYC',
    example: 'Invalid or unclear document images',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  @Matches(/^[a-zA-Z0-9\s.,!?@#$%&*()\-_+=;:'"/\[\]{}|\\<>]+$/, {
    message:
      'Reason contains invalid characters. Only alphanumeric characters and common punctuation are allowed',
  })
  reason: string;
}
