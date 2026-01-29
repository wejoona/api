import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Update FCM Token DTO
 *
 * Request body for updating a device's FCM token
 */
export class UpdateFcmTokenDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @ApiProperty({
    description: 'Firebase Cloud Messaging token for push notifications',
    example: 'dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx...',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
