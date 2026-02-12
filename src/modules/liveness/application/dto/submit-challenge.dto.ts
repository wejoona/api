import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitChallengeDto {
  @ApiProperty({ description: 'Liveness session ID', format: 'uuid' })
  @IsString()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Challenge ID to submit response for', format: 'uuid' })
  @IsString()
  @IsUUID()
  challengeId: string;

  @ApiProperty({ description: 'Base64 encoded video frame or selfie image' })
  @IsString()
  videoFrameBase64: string;
}
