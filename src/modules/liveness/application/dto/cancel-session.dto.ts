import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelSessionDto {
  @ApiProperty({ description: 'Liveness session ID to cancel', format: 'uuid' })
  @IsString()
  @IsUUID()
  sessionId: string;
}
