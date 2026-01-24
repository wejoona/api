import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponse {
  @ApiProperty({
    description: 'Number of unread notifications',
    example: 5,
  })
  count: number;
}
