/**
 * Admin Controller - Authorized Tests (admin user)
 */
import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TEST_ADMIN } from '../setup/test-app';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PinVerificationGuard } from '@/common/guards/pin-verification.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';

const mockAdminService = {
  getDashboardStats: jest.fn(),
  getEnhancedDashboardStats: jest.fn(),
  listUsers: jest.fn(),
  getUser: jest.fn(),
  suspendUser: jest.fn(),
  unsuspendUser: jest.fn(),
  updateUserRole: jest.fn(),
  approveKyc: jest.fn(),
  rejectKyc: jest.fn(),
};
const mockAuditService = { query: jest.fn() };

import { AdminController } from '@modules/admin/application/controllers/admin.controller';
import { AdminService } from '@modules/admin/application/services/admin.service';
import { AuditService } from '@modules/admin/application/services/audit.service';
import { ValidationPipe } from '@nestjs/common';

class AdminJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = TEST_ADMIN;
    return true;
  }
}

class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector = new Reflector()) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return roles.some((r) => user?.role === r || user?.role === 'super_admin');
  }
}

class NoopGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('AdminController - Authorized (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: AuditService, useValue: mockAuditService },
        Reflector,
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AdminJwtGuard)
      .overrideGuard(RolesGuard)
      .useClass(AdminRolesGuard)
      .overrideGuard(PinVerificationGuard)
      .useClass(NoopGuard)
      .overrideGuard(ThrottlerGuard)
      .useClass(NoopGuard)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return dashboard stats for admin (200)', async () => {
      mockAdminService.getDashboardStats.mockResolvedValue({
        totalUsers: 100,
        activeUsers: 90,
        suspendedUsers: 10,
        kycPendingUsers: 5,
        kycApprovedUsers: 80,
        totalTransactions: 5000,
        pendingTransactions: 5,
        completedTransactions: 4900,
        failedTransactions: 95,
        totalVolume: 100000,
        todayVolume: 1000,
      });
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(200);
    });
  });

  describe('GET /api/v1/admin/dashboard/enhanced', () => {
    it('should return enhanced stats (200)', async () => {
      mockAdminService.getEnhancedDashboardStats.mockResolvedValue({
        totalUsers: 100,
        activeUsers: 90,
        suspendedUsers: 10,
        kycPendingUsers: 5,
        kycApprovedUsers: 80,
        totalTransactions: 5000,
        pendingTransactions: 5,
        completedTransactions: 4900,
        failedTransactions: 95,
        totalVolume: 100000,
        todayVolume: 1000,
        transactionTimeSeries: [],
        userGrowthTimeSeries: [],
        transactionsByType: {},
        transactionsByStatus: {},
      });
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/enhanced')
        .expect(200);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should list users (200)', async () => {
      mockAdminService.listUsers.mockResolvedValue({ users: [], total: 0 });
      await request(app.getHttpServer()).get('/api/v1/admin/users').expect(200);
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should get user (200)', async () => {
      mockAdminService.getUser.mockResolvedValue({
        id: '123',
        phone: '+225',
      });
      await request(app.getHttpServer())
        .get('/api/v1/admin/users/123')
        .expect(200);
    });
  });

  describe('POST /api/v1/admin/users/:userId/suspend', () => {
    it('should suspend user (200)', async () => {
      mockAdminService.suspendUser.mockResolvedValue({
        id: '123',
        status: 'suspended',
      });
      await request(app.getHttpServer())
        .post('/api/v1/admin/users/123/suspend')
        .send({ reason: 'fraud' })
        .expect(200);
    });
  });

  describe('POST /api/v1/admin/users/:userId/unsuspend', () => {
    it('should unsuspend user (200)', async () => {
      mockAdminService.unsuspendUser.mockResolvedValue({
        id: '123',
        status: 'active',
      });
      await request(app.getHttpServer())
        .post('/api/v1/admin/users/123/unsuspend')
        .expect(200);
    });
  });

  describe('POST /api/v1/admin/users/:userId/kyc/approve', () => {
    it('should approve KYC (200)', async () => {
      mockAdminService.approveKyc.mockResolvedValue({
        id: '123',
        kycStatus: 'approved',
      });
      await request(app.getHttpServer())
        .post('/api/v1/admin/users/123/kyc/approve')
        .expect(200);
    });
  });

  describe('POST /api/v1/admin/users/:userId/kyc/reject', () => {
    it('should reject KYC (200)', async () => {
      mockAdminService.rejectKyc.mockResolvedValue({
        id: '123',
        kycStatus: 'rejected',
      });
      await request(app.getHttpServer())
        .post('/api/v1/admin/users/123/kyc/reject')
        .send({ reason: 'Invalid documents' })
        .expect(200);
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should return audit logs (200)', async () => {
      mockAuditService.query.mockResolvedValue({ logs: [], total: 0 });
      await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .expect(200);
    });
  });
});
