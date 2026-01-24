import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyReferralCodeRequest {
  @ApiProperty({
    description: 'The referral code to apply',
    example: 'ABC12345',
  })
  @IsString()
  @Length(6, 20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Referral code must be alphanumeric uppercase',
  })
  code: string;
}
