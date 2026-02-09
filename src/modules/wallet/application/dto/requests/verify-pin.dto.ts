import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class WalletVerifyPinDto {
  @ApiProperty({
    description: 'The 4-6 digit PIN to verify',
    example: '1234',
    minLength: 4,
    maxLength: 6,
  })
  @IsString()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin: string;
}
