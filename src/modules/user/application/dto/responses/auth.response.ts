import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponse } from './user.response';

export class AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;

  @ApiPropertyOptional({
    example: 'documents_pending',
    description:
      'Current KYC verification status. Wallet is created after KYC approval.',
  })
  kycStatus?: string;
}

export class RefreshResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}

export class OtpSentResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ example: 300, description: 'OTP expiry in seconds' })
  expiresIn: number;
}

export class LogoutResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class LogoutAllResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'All devices logged out successfully' })
  message: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of sessions invalidated (0 if not tracked)',
  })
  sessionsInvalidated?: number;
}
