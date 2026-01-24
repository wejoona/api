import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponse } from './notification.response';

export class NotificationListResponse {
  @ApiProperty({
    description: 'List of notifications',
    type: [NotificationResponse],
  })
  notifications: NotificationResponse[];

  @ApiProperty({
    description: 'Total number of notifications',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Number of unread notifications',
    example: 5,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Limit used for pagination',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Offset used for pagination',
    example: 0,
  })
  offset: number;
}
