import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { Session } from '../../domain/entities/session.entity';

export interface CreateSessionParams {
  userId: string;
  deviceId?: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  expiresInSeconds: number;
}

export interface SessionResponse {
  id: string;
  userId: string;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly MAX_ACTIVE_SESSIONS = 10;

  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Create a new session record.
   * The refresh token is hashed before storage.
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const {
      userId,
      deviceId,
      refreshToken,
      ipAddress,
      userAgent,
      location,
      expiresInSeconds,
    } = params;

    // Enforce maximum concurrent sessions per user
    const activeCount = await this.sessionRepository.countActiveByUserId(userId);
    if (activeCount >= this.MAX_ACTIVE_SESSIONS) {
      this.logger.warn(
        `User ${userId} has ${activeCount} active sessions, revoking oldest`,
      );
      // Revoke oldest session to make room
      const sessions = await this.sessionRepository.findActiveByUserId(userId);
      if (sessions.length > 0) {
        const oldest = sessions[sessions.length - 1]; // Assuming sorted by creation
        oldest.revoke('max_sessions_exceeded');
        await this.sessionRepository.save(oldest);
      }
    }

    const normalizedDeviceId = this.normalizeInternalDeviceId(deviceId);
    if (deviceId && !normalizedDeviceId) {
      this.logger.warn(
        `Ignoring external device identifier for session FK: ${deviceId}`,
      );
    }

    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const session = Session.create({
      userId,
      deviceId: normalizedDeviceId,
      refreshTokenHash,
      ipAddress,
      userAgent,
      location,
      expiresAt,
    });

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Created session ${saved.id} for user ${userId}`);
    return saved;
  }

  /**
   * Validate a refresh token and return the session.
   */
  async validateRefreshToken(refreshToken: string): Promise<Session | null> {
    const tokenHash = this.hashToken(refreshToken);
    const session =
      await this.sessionRepository.findByRefreshTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    if (!session.isValid) {
      return null;
    }

    // Update last activity
    session.recordActivity();
    await this.sessionRepository.save(session);

    return session;
  }

  /**
   * Get active sessions for a user.
   */
  async getActiveSessions(userId: string): Promise<SessionResponse[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);
    return sessions.map(this.toResponse);
  }

  /**
   * Get all sessions for a user (including revoked).
   */
  async getAllSessions(userId: string): Promise<SessionResponse[]> {
    const sessions = await this.sessionRepository.findByUserId(userId);
    return sessions.map(this.toResponse);
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    reason?: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Session does not belong to user');
    }

    session.revoke(reason ?? 'user_logout');
    await this.sessionRepository.save(session);
    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revoke all sessions for a user (logout from all devices).
   */
  async revokeAllSessions(userId: string, reason?: string): Promise<number> {
    const count = await this.sessionRepository.revokeAllForUser(
      userId,
      reason ?? 'logout_all',
    );
    this.logger.log(`Revoked ${count} sessions for user ${userId}`);
    return count;
  }

  /**
   * Revoke all sessions for a specific device.
   */
  async revokeSessionsByDevice(
    deviceId: string,
    reason?: string,
  ): Promise<number> {
    const count = await this.sessionRepository.revokeByDeviceId(
      deviceId,
      reason ?? 'device_revoked',
    );
    this.logger.log(`Revoked ${count} sessions for device ${deviceId}`);
    return count;
  }

  /**
   * Cleanup expired sessions (called by scheduled job).
   */
  async cleanupExpiredSessions(): Promise<number> {
    const count = await this.sessionRepository.cleanupExpired();
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired sessions`);
    }
    return count;
  }

  /**
   * Count active sessions for a user.
   */
  async countActiveSessions(userId: string): Promise<number> {
    return this.sessionRepository.countActiveByUserId(userId);
  }

  /**
   * Hash the refresh token for secure storage.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private normalizeInternalDeviceId(deviceId?: string): string | null {
    if (!deviceId) return null;
    return this.isUuid(deviceId) ? deviceId : null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private toResponse(session: Session): SessionResponse {
    return {
      id: session.id,
      userId: session.userId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      location: session.location,
      isActive: session.isActive,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }
}
