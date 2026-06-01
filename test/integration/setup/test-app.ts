/**
 * Test App Bootstrap
 *
 * Creates a lightweight NestJS testing module with mocked services.
 * Guards are overridden to allow controlled auth testing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PinVerificationGuard } from '@/common/guards/pin-verification.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';
import { IdempotencyGuard } from '@/common/middleware/idempotency';
import { WALLET_REPOSITORY } from '@/modules/wallet/domain/repositories/wallet.repository';
import { UserRepository } from '@/modules/user/infrastructure/repositories';
import { JweDecryptInterceptor } from '@/modules/security/application/interceptors/jwe-decrypt.interceptor';
import { ServerKeyService } from '@/modules/security/application/services/server-key.service';

/**
 * Default mock user for authenticated requests
 */
export const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440000',
  phone: '+2250701234567',
  walletId: '660e8400-e29b-41d4-a716-446655440000',
  role: 'user',
  status: 'active',
  countryCode: 'CI',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: null,
  kycStatus: 'verified',
};

export const TEST_ADMIN = {
  ...TEST_USER,
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  role: 'admin',
  phone: '+2250701234568',
  username: 'testadmin',
};

export const TEST_SUPER_ADMIN = {
  ...TEST_ADMIN,
  id: '550e8400-e29b-41d4-a716-446655440002',
  userId: '550e8400-e29b-41d4-a716-446655440002',
  role: 'super_admin',
  phone: '+2250701234569',
  username: 'testsuperadmin',
};

/**
 * Mock JwtAuthGuard that injects test user into request
 */
export class MockJwtAuthGuard implements CanActivate {
  private user: any = TEST_USER;

  setUser(user: any) {
    this.user = user;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = this.user;
    return true;
  }
}

/**
 * Mock JwtAuthGuard that rejects all requests (for 401 tests)
 */
export class RejectingJwtAuthGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

/**
 * Mock PinVerificationGuard that always passes
 */
export class MockPinGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

/**
 * Mock RolesGuard that checks req.user.role
 */
export class MockRolesGuard implements CanActivate {
  constructor(private reflector: Reflector = new Reflector()) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(
      (role) => user?.role === role || user?.role === 'super_admin',
    );
  }
}

/**
 * Mock ThrottlerGuard that always passes
 */
export class MockThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

export class MockIdempotencyGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

export interface TestAppOptions {
  controllers: any[];
  providers: any[];
  /** Authenticated user injected by the mock JwtAuthGuard */
  authUser?: any;
  /** Override guards (defaults to mock all) */
  guardOverrides?: Record<string, any>;
}

type ProviderLike =
  | any
  | {
      provide: any;
      useValue?: Record<PropertyKey, any>;
    };

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const values: Record<string, unknown> = {
      'redis.host': 'localhost',
      'redis.port': 6379,
      'redis.password': undefined,
      'redis.db': 15,
      nodeEnv: 'test',
    };
    return values[key] ?? defaultValue;
  }),
};

const mockRepository = {
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByPhone: jest.fn(),
  findByUsername: jest.fn(),
  findAll: jest.fn(),
  searchByUsername: jest.fn(),
  existsByPhone: jest.fn(),
  existsByUsername: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const noopIdempotencyInterceptor = {
  intercept: (_context: ExecutionContext, next: any) => next.handle(),
  onModuleDestroy: jest.fn(),
};

const mockServerKeyService = {
  getPublicKey: jest.fn(),
  decryptJwe: jest.fn(),
};

function defaultTestProviders() {
  return [
    Reflector,
    MockJwtAuthGuard,
    MockPinGuard,
    MockRolesGuard,
    MockThrottlerGuard,
    {
      provide: ConfigService,
      useValue: mockConfigService,
    },
    {
      provide: IdempotencyInterceptor,
      useValue: noopIdempotencyInterceptor,
    },
    {
      provide: JweDecryptInterceptor,
      useValue: noopIdempotencyInterceptor,
    },
    {
      provide: ServerKeyService,
      useValue: mockServerKeyService,
    },
    {
      provide: UserRepository,
      useValue: mockRepository,
    },
    {
      provide: WALLET_REPOSITORY,
      useValue: mockRepository,
    },
    {
      provide: CACHE_MANAGER,
      useValue: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
      },
    },
  ];
}

function createLenientMock<T extends Record<PropertyKey, any>>(mock: T): T {
  if (!mock || typeof mock !== 'object' || mock instanceof Date) {
    return mock;
  }

  return new Proxy(mock, {
    get(target, property, receiver) {
      if (property === 'then') {
        return undefined;
      }

      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      if (typeof property === 'string') {
        const fallback = jest.fn().mockImplementation((...args: unknown[]) => {
          if (process.env.DEBUG_TEST_MOCKER === 'true') {
            // eslint-disable-next-line no-console
            console.log('Fallback mock method', property, args);
          }

          return Promise.resolve({});
        });
        Reflect.set(target, property, fallback, receiver);
        return fallback;
      }

      return Reflect.get(target, property, receiver);
    },
  });
}

function wrapProviderMocks(provider: ProviderLike): ProviderLike {
  if (
    provider &&
    typeof provider === 'object' &&
    'useValue' in provider &&
    provider.useValue &&
    typeof provider.useValue === 'object'
  ) {
    return {
      ...provider,
      useValue: createLenientMock(provider.useValue),
    };
  }

  return provider;
}

function createJwtGuard(user: any): CanActivate {
  return {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = user;
      return true;
    },
  };
}

function createFallbackMock(token?: unknown) {
  if (token === Object) {
    return {};
  }

  if (
    process.env.DEBUG_TEST_MOCKER === 'true' &&
    typeof token === 'function' &&
    token.name.includes('Pipe')
  ) {
    // eslint-disable-next-line no-console
    console.log('Mocking token', token.name);
  }

  if (token === ParseUUIDPipe) {
    return new ParseUUIDPipe();
  }

  if (token === ParseIntPipe) {
    return new ParseIntPipe();
  }

  return createLenientMock({});
}

/**
 * Create a test NestJS app with mocked guards and validation
 */
export async function createTestApp(options: TestAppOptions): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
    controllers: options.controllers,
    providers: [
      ...defaultTestProviders().map(wrapProviderMocks),
      ...options.providers.map(wrapProviderMocks),
    ],
  }).useMocker(createFallbackMock);

  // Override guards
  moduleBuilder
    .overrideGuard(JwtAuthGuard)
    .useValue(createJwtGuard(options.authUser ?? TEST_USER))
    .overrideGuard(PinVerificationGuard)
    .useClass(MockPinGuard)
    .overrideGuard(RolesGuard)
    .useClass(MockRolesGuard)
    .overrideGuard(ThrottlerGuard)
    .useClass(MockThrottlerGuard)
    .overrideGuard(IdempotencyGuard)
    .useClass(MockIdempotencyGuard);

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  // Apply global prefix and validation pipe like production
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return { app, module };
}

/**
 * Create a test app that rejects auth (for 401 tests)
 */
export async function createUnauthTestApp(
  options: Omit<TestAppOptions, 'guardOverrides'>,
): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
    controllers: options.controllers,
    providers: [
      ...defaultTestProviders().map(wrapProviderMocks),
      ...options.providers.map(wrapProviderMocks),
    ],
  }).useMocker(createFallbackMock);

  moduleBuilder
    .overrideGuard(JwtAuthGuard)
    .useClass(RejectingJwtAuthGuard)
    .overrideGuard(PinVerificationGuard)
    .useClass(MockPinGuard)
    .overrideGuard(RolesGuard)
    .useClass(MockRolesGuard)
    .overrideGuard(ThrottlerGuard)
    .useClass(MockThrottlerGuard)
    .overrideGuard(IdempotencyGuard)
    .useClass(MockIdempotencyGuard);

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return { app, module };
}
