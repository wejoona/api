import { ApiProperty } from '@nestjs/swagger';

/**
 * Retry Dead Letter Response DTO
 *
 * Result of retrying a dead-letter entry
 */
export class RetryDeadletterResponseDto {
  @ApiProperty({
    description: 'Whether the retry was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Webhook successfully reprocessed',
  })
  message: string;

  @ApiProperty({
    description: 'New status of the entry after retry',
    example: 'resolved',
    enum: ['resolved', 'pending'],
    required: false,
  })
  newStatus?: 'resolved' | 'pending';
}
