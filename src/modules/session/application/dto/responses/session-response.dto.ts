import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SessionResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  deviceId: string | null;

  @Expose()
  ipAddress: string | null;

  @Expose()
  userAgent: string | null;

  @Expose()
  location: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  lastActivityAt: Date;

  @Expose()
  expiresAt: Date;

  @Expose()
  createdAt: Date;
}
