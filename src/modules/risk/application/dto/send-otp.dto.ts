import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Challenge token from step-up evaluation' })
  @IsString()
  challengeToken: string;
}
