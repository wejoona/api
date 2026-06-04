import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogoutUsecase } from './logout.usecase';
import {
  createMockConfigService,
  createMockJwtService,
  createMockRedisClient,
  MockRedisClient,
} from '../../../../../test/helpers/test-utils';

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => createMockRedisClient());
  return { default: mockRedis, __esModule: true };
});

describe('LogoutUsecase', () => {
  let usecase: LogoutUsecase;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;
  let mockRedisClient: MockRedisClient;
  let eventEmitter: { emit: jest.Mock };

  const userId = 'user-123';
  const refreshToken = 'valid.refresh.token';

  beforeEach(async () => {
    jwtService = createMockJwtService();
    configService = createMockConfigService({
      'jwt.refreshSecret': 'test-refresh-secret',
    });
    mockRedisClient = createMockRedisClient();
    eventEmitter = { emit: jest.fn() };

    const Redis = require('ioredis').default;
    Redis.mockImplementation(() => {
      setTimeout(() => {
        const connectHandler = mockRedisClient.on.mock.calls.find(
          ([event]) => event === 'connect',
        );
        if (connectHandler && connectHandler[1]) {
          connectHandler[1]();
        }
      }, 0);
      return mockRedisClient;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUsecase,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    usecase = module.get<LogoutUsecase>(LogoutUsecase);
    (usecase as any).isRedisConnected = true;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await usecase.onModuleDestroy();
  });

  it('blacklists a verified refresh token for the current user', async () => {
    jwtService.verify.mockReturnValue({
      sub: userId,
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await usecase.execute({ userId, refreshToken });

    expect(result).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
    expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
      secret: 'test-refresh-secret',
    });
    expect(mockRedisClient.setex).toHaveBeenCalledWith(
      `blacklist:${refreshToken}`,
      expect.any(Number),
      '1',
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('user.logged_out', {
      userId,
      timestamp: expect.any(Date),
    });
  });

  it('rejects unsigned or forged refresh-token bodies', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await expect(
      usecase.execute({ userId, refreshToken: 'forged.refresh.token' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      usecase.execute({ userId, refreshToken: 'forged.refresh.token' }),
    ).rejects.toThrow('Invalid refresh token');
    expect(mockRedisClient.setex).not.toHaveBeenCalled();
  });

  it('rejects access tokens used as logout refresh tokens', async () => {
    jwtService.verify.mockReturnValue({
      sub: userId,
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await expect(usecase.execute({ userId, refreshToken })).rejects.toThrow(
      'Invalid token type',
    );
    expect(mockRedisClient.setex).not.toHaveBeenCalled();
  });
});
