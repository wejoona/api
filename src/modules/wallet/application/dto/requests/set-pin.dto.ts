import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  @ApiProperty({
    description: 'The 4-6 digit PIN to set',
    example: '1234',
    minLength: 4,
    maxLength: 6,
  })
  @IsString()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin: string;

  @ApiProperty({
    description: 'Confirm the PIN (must match)',
    example: '1234',
    minLength: 4,
    maxLength: 6,
  })
  @IsString()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  confirmPin: string;
}
