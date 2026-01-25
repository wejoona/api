import { ApiProperty } from '@nestjs/swagger';

/**
 * Dead Letter Stats Response DTO
 *
 * Statistics about the webhook dead-letter queue
 */
export class DeadletterStatsResponseDto {
  @ApiProperty({
    description: 'Number of pending dead-letter entries',
    example: 5,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of resolved dead-letter entries',
    example: 120,
  })
  resolved: number;

  @ApiProperty({
    description: 'Number of ignored dead-letter entries',
    example: 3,
  })
  ignored: number;

  @ApiProperty({
    description: 'Total number of dead-letter entries',
    example: 128,
  })
  total: number;
}
