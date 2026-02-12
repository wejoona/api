/**
 * Test App Bootstrap
 *
 * Creates a lightweight NestJS testing module with mocked services.
 * Guards are overridden to allow controlled auth testing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PinVerificationGuard } from '@/common/guards/pin-verification.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';

/**
 * Default mock user for authenticated requests
 */
export const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
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
  role: 'admin',
  phone: '+2250701234568',
  username: 'testadmin',
};

export const TEST_SUPER_ADMIN = {
  ...TEST_ADMIN,
  id: '550e8400-e29b-41d4-a716-446655440002',
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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role || user?.role === 'super_admin');
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

export interface TestAppOptions {
  controllers: any[];
  providers: any[];
  /** Override guards (defaults to mock all) */
  guardOverrides?: Record<string, any>;
}

/**
 * Create a test NestJS app with mocked guards and validation
 */
export async function createTestApp(options: TestAppOptions): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    ],
    controllers: options.controllers,
    providers: [
      ...options.providers,
      Reflector,
      {
        provide: CACHE_MANAGER,
        useValue: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue(undefined),
          del: jest.fn().mockResolvedValue(undefined),
        },
      },
    ],
  });

  // Override guards
  moduleBuilder
    .overrideGuard(JwtAuthGuard).useClass(MockJwtAuthGuard)
    .overrideGuard(PinVerificationGuard).useClass(MockPinGuard)
    .overrideGuard(RolesGuard).useClass(MockRolesGuard)
    .overrideGuard(ThrottlerGuard).useClass(MockThrottlerGuard);

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
export async function createUnauthTestApp(options: Omit<TestAppOptions, 'guardOverrides'>): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    ],
    controllers: options.controllers,
    providers: [
      ...options.providers,
      Reflector,
      {
        provide: CACHE_MANAGER,
        useValue: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue(undefined),
          del: jest.fn().mockResolvedValue(undefined),
        },
      },
    ],
  });

  moduleBuilder
    .overrideGuard(JwtAuthGuard).useClass(RejectingJwtAuthGuard)
    .overrideGuard(PinVerificationGuard).useClass(MockPinGuard)
    .overrideGuard(RolesGuard).useClass(MockRolesGuard)
    .overrideGuard(ThrottlerGuard).useClass(MockThrottlerGuard);

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
