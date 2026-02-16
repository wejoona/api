import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Challenge token from step-up evaluation' })
  @IsString()
  challengeToken: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
