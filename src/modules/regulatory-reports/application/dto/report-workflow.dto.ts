import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ReportNotesDto {
  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportRejectDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
