import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Device Action Response DTO
 *
 * Response for device trust/revoke actions
 */
export class DeviceActionResponseDto {
  @ApiProperty({
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Action result message',
    example: 'Device trusted successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Number of devices affected (for bulk operations)',
    example: 3,
  })
  count?: number;
}
