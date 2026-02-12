import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteSessionDto {
  @ApiProperty({ description: 'Liveness session ID', format: 'uuid' })
  @IsString()
  @IsUUID()
  sessionId: string;
}
