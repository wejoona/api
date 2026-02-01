import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  data: Record<string, unknown>;
}
