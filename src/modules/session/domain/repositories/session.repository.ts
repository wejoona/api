import { Session } from '../entities/session.entity';

export abstract class SessionRepository {
  abstract findById(id: string): Promise<Session | null>;

  abstract findByRefreshTokenHash(tokenHash: string): Promise<Session | null>;

  abstract findByUserId(userId: string): Promise<Session[]>;

  abstract findActiveByUserId(userId: string): Promise<Session[]>;

  abstract save(session: Session): Promise<Session>;

  abstract revokeAllForUser(userId: string, reason?: string): Promise<number>;

  abstract revokeByDeviceId(deviceId: string, reason?: string): Promise<number>;

  abstract cleanupExpired(): Promise<number>;

  abstract countActiveByUserId(userId: string): Promise<number>;
}
