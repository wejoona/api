import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponse } from './user.response';

export class AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether a wallet was auto-created on first verification',
  })
  walletCreated?: boolean;
}

export class OtpSentResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ example: 300, description: 'OTP expiry in seconds' })
  expiresIn: number;
}
