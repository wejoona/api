import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateStepUpDto {
  @ApiProperty({ description: 'Challenge token from step-up evaluation' })
  @IsString()
  challengeToken: string;

  @ApiPropertyOptional({ description: 'Liveness session ID if liveness was required' })
  @IsOptional()
  @IsString()
  livenessSessionId?: string;

  @ApiPropertyOptional({ description: 'Whether biometric verification passed' })
  @IsOptional()
  @IsBoolean()
  biometricVerified?: boolean;

  @ApiPropertyOptional({ description: 'Whether OTP verification passed' })
  @IsOptional()
  @IsBoolean()
  otpVerified?: boolean;
}
