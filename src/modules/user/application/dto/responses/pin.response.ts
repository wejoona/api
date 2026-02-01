import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPinResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PIN set successfully' })
  message: string;
}

export class ChangePinResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PIN changed successfully' })
  message: string;
}

export class VerifyPinResponse {
  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({
    example: 'abc123def456...',
    description: 'Time-limited token for use in X-Pin-Token header',
  })
  pinToken: string;

  @ApiProperty({
    example: 300,
    description: 'Token expiry time in seconds (5 minutes)',
  })
  expiresIn: number;
}

export class ResetPinResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PIN reset successfully' })
  message: string;
}

export class PinErrorResponse {
  @ApiProperty({ example: 'Invalid PIN' })
  message: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Remaining attempts before lockout',
  })
  remainingAttempts?: number;

  @ApiPropertyOptional({
    example: '2026-01-30T12:30:00Z',
    description: 'Time when PIN will be unlocked',
  })
  lockedUntil?: Date;
}
