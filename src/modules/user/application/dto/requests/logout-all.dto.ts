import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class LogoutAllDto {
  @ApiPropertyOptional({
    description:
      'Current refresh token to preserve (optional - keeps current session active)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsOptional()
  currentRefreshToken?: string;
}
