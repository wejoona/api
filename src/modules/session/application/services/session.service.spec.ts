import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { Session } from '../../domain/entities/session.entity';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionRepository,
          useValue: {
            findById: jest.fn(),
            findByRefreshTokenHash: jest.fn(),
            findByUserId: jest.fn(),
            findActiveByUserId: jest.fn(),
            save: jest.fn(),
            revokeAllForUser: jest.fn(),
            revokeByDeviceId: jest.fn(),
            cleanupExpired: jest.fn(),
            countActiveByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get(SessionRepository);
  });

  describe('createSession', () => {
    it('should create a session with hashed token', async () => {
      const params = {
        userId: 'user-id',
        deviceId: '4b862970-854d-4a84-98f0-2c36b01c1e87',
        refreshToken: 'refresh-token',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        location: 'Abidjan, CI',
        expiresInSeconds: 604800,
      };

      sessionRepository.save.mockImplementation(async (session) => session);

      const result = await service.createSession(params);

      expect(result).toBeDefined();
      expect(result.userId).toBe(params.userId);
      expect(result.deviceId).toBe(params.deviceId);
      expect(result.ipAddress).toBe(params.ipAddress);
      expect(result.isActive).toBe(true);
      expect(sessionRepository.save).toHaveBeenCalled();
    });

    it('should ignore external device identifiers that are not internal UUIDs', async () => {
      const params = {
        userId: 'user-id',
        deviceId: 'ios-simulator-external-id',
        refreshToken: 'refresh-token',
        expiresInSeconds: 604800,
      };

      sessionRepository.save.mockImplementation(async (session) => session);

      const result = await service.createSession(params);

      expect(result).toBeDefined();
      expect(result.userId).toBe(params.userId);
      expect(result.deviceId).toBeNull();
      expect(sessionRepository.save).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return session if token is valid', async () => {
      const session = Session.create({
        userId: 'user-id',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
      });

      sessionRepository.findByRefreshTokenHash.mockResolvedValue(session);
      sessionRepository.save.mockImplementation(async (s) => s);

      const result = await service.validateRefreshToken('token');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user-id');
      expect(sessionRepository.save).toHaveBeenCalled();
    });

    it('should return null if session not found', async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(null);

      const result = await service.validateRefreshToken('token');

      expect(result).toBeNull();
    });

    it('should return null if session is expired', async () => {
      const session = Session.create({
        userId: 'user-id',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() - 10000),
      });

      sessionRepository.findByRefreshTokenHash.mockResolvedValue(session);

      const result = await service.validateRefreshToken('token');

      expect(result).toBeNull();
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for user', async () => {
      const sessions = [
        Session.create({
          userId: 'user-id',
          refreshTokenHash: 'hash1',
          expiresAt: new Date(Date.now() + 10000),
        }),
        Session.create({
          userId: 'user-id',
          refreshTokenHash: 'hash2',
          expiresAt: new Date(Date.now() + 10000),
        }),
      ];

      sessionRepository.findActiveByUserId.mockResolvedValue(sessions);

      const result = await service.getActiveSessions('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-id');
    });
  });

  describe('attachLatestActiveSessionToDevice', () => {
    it('links the latest active session without a device', async () => {
      const session = Session.create({
        userId: 'user-id',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
      });
      sessionRepository.findActiveByUserId.mockResolvedValue([session]);
      sessionRepository.save.mockImplementation(async (s) => s);

      const linked = await service.attachLatestActiveSessionToDevice(
        'user-id',
        '4b862970-854d-4a84-98f0-2c36b01c1e87',
      );

      expect(linked).toBe(true);
      expect(session.deviceId).toBe('4b862970-854d-4a84-98f0-2c36b01c1e87');
      expect(sessionRepository.save).toHaveBeenCalledWith(session);
    });

    it('does not link external non-UUID device identifiers', async () => {
      const linked = await service.attachLatestActiveSessionToDevice(
        'user-id',
        'ios-simulator-external-id',
      );

      expect(linked).toBe(false);
      expect(sessionRepository.findActiveByUserId).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should revoke session if it belongs to user', async () => {
      const session = Session.create({
        userId: 'user-id',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
      });

      sessionRepository.findById.mockResolvedValue(session);
      sessionRepository.save.mockImplementation(async (s) => s);

      await service.revokeSession('user-id', session.id, 'test_reason');

      expect(sessionRepository.save).toHaveBeenCalled();
      expect(session.isActive).toBe(false);
      expect(session.revokedReason).toBe('test_reason');
    });

    it('should throw NotFoundException if session not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      await expect(
        service.revokeSession('user-id', 'session-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if session belongs to different user', async () => {
      const session = Session.create({
        userId: 'other-user-id',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
      });

      sessionRepository.findById.mockResolvedValue(session);

      await expect(
        service.revokeSession('user-id', session.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for user', async () => {
      sessionRepository.revokeAllForUser.mockResolvedValue(3);

      const count = await service.revokeAllSessions('user-id', 'logout_all');

      expect(count).toBe(3);
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith(
        'user-id',
        'logout_all',
      );
    });
  });

  describe('revokeSessionsByDevice', () => {
    it('should revoke all sessions for device', async () => {
      sessionRepository.revokeByDeviceId.mockResolvedValue(2);

      const count = await service.revokeSessionsByDevice(
        'device-id',
        'device_revoked',
      );

      expect(count).toBe(2);
      expect(sessionRepository.revokeByDeviceId).toHaveBeenCalledWith(
        'device-id',
        'device_revoked',
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      sessionRepository.cleanupExpired.mockResolvedValue(5);

      const count = await service.cleanupExpiredSessions();

      expect(count).toBe(5);
      expect(sessionRepository.cleanupExpired).toHaveBeenCalled();
    });
  });

  describe('countActiveSessions', () => {
    it('should return count of active sessions', async () => {
      sessionRepository.countActiveByUserId.mockResolvedValue(3);

      const count = await service.countActiveSessions('user-id');

      expect(count).toBe(3);
      expect(sessionRepository.countActiveByUserId).toHaveBeenCalledWith(
        'user-id',
      );
    });
  });
});
