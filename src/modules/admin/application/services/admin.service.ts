import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { SystemMetricEntity } from '../../infrastructure/persistence/typeorm/entities/system-metric.entity';
import { AuditService } from './audit.service';

export interface UserListQuery {
  page?: number;
  limit?: number;
  status?: string;
  kycStatus?: string;
  role?: string;
  search?: string;
}

export interface TransactionListQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  kycPendingUsers: number;
  kycApprovedUsers: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  totalVolume: number;
  todayVolume: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(SystemMetricEntity)
    private readonly metricRepository: Repository<SystemMetricEntity>,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // User Management
  // ==========================================

  /**
   * Sanitize search input to prevent SQL injection
   * - Escape SQL wildcards (% and _)
   * - Remove special characters except alphanumeric, spaces, @, ., +, -
   * - Limit length to 100 chars
   */
  private sanitizeSearchInput(search: string): string {
    // Remove any characters that aren't alphanumeric, spaces, @, ., +, or -
    let sanitized = search.replace(/[^a-zA-Z0-9\s@.+\-]/g, '');

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 100);

    // Escape SQL wildcards for LIKE queries
    sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');

    return sanitized;
  }

  async listUsers(
    query: UserListQuery,
  ): Promise<{ users: UserOrmEntity[]; total: number }> {
    const page = query.page || 1;
    // SECURITY: Enforce maximum pagination limit to prevent DoS
    const limit = Math.min(query.limit || 50, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.kycStatus) {
      queryBuilder.andWhere('user.kycStatus = :kycStatus', {
        kycStatus: query.kycStatus,
      });
    }

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', { role: query.role });
    }

    if (query.search) {
      // Validate minimum length requirement
      if (query.search.length < 3) {
        throw new BadRequestException(
          'Search query must be at least 3 characters long',
        );
      }

      // Sanitize the search input to prevent SQL injection
      const sanitizedSearch = this.sanitizeSearchInput(query.search);

      if (!sanitizedSearch) {
        throw new BadRequestException(
          'Search query contains only invalid characters',
        );
      }

      queryBuilder.andWhere(
        '(user.phone LIKE :search OR user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${sanitizedSearch}%` },
      );
    }

    const [users, total] = await queryBuilder.getManyAndCount();
    return { users, total };
  }

  async getUser(userId: string): Promise<UserOrmEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return user;
  }

  async suspendUser(
    userId: string,
    reason: string,
    adminId: string,
  ): Promise<UserOrmEntity> {
    const user = await this.getUser(userId);

    if (user.status === 'suspended') {
      throw new BadRequestException('User is already suspended');
    }

    if (user.role === 'super_admin') {
      throw new BadRequestException('Cannot suspend a super admin');
    }

    // Sanitize reason before storing (additional safety layer)
    const sanitizedReason = reason.trim().substring(0, 500);

    user.status = 'suspended';
    user.suspendedAt = new Date();
    user.suspendedReason = sanitizedReason;
    user.updatedAt = new Date();

    const saved = await this.userRepository.save(user);

    await this.auditService.logAdminAction(
      adminId,
      'user.suspend',
      'user',
      userId,
      { reason: sanitizedReason },
    );

    this.logger.log(
      `User ${userId} suspended by admin ${adminId}: ${sanitizedReason}`,
    );
    return saved;
  }

  async unsuspendUser(userId: string, adminId: string): Promise<UserOrmEntity> {
    const user = await this.getUser(userId);

    if (user.status !== 'suspended') {
      throw new BadRequestException('User is not suspended');
    }

    user.status = 'active';
    user.suspendedAt = null;
    user.suspendedReason = null;
    user.updatedAt = new Date();

    const saved = await this.userRepository.save(user);

    await this.auditService.logAdminAction(
      adminId,
      'user.unsuspend',
      'user',
      userId,
    );

    this.logger.log(`User ${userId} unsuspended by admin ${adminId}`);
    return saved;
  }

  async updateUserRole(
    userId: string,
    role: string,
    adminId: string,
  ): Promise<UserOrmEntity> {
    const user = await this.getUser(userId);
    const previousRole = user.role;

    if (!['user', 'admin', 'super_admin'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    user.role = role;
    user.updatedAt = new Date();

    const saved = await this.userRepository.save(user);

    await this.auditService.logAdminAction(
      adminId,
      'user.role_change',
      'user',
      userId,
      { previousRole, newRole: role },
    );

    this.logger.log(
      `User ${userId} role changed from ${previousRole} to ${role} by admin ${adminId}`,
    );
    return saved;
  }

  async approveKyc(userId: string, adminId: string): Promise<UserOrmEntity> {
    const user = await this.getUser(userId);

    if (user.kycStatus === 'approved') {
      throw new BadRequestException('KYC is already approved');
    }

    const previousStatus = user.kycStatus;
    user.kycStatus = 'approved';
    user.updatedAt = new Date();

    const saved = await this.userRepository.save(user);

    await this.auditService.logAdminAction(
      adminId,
      'user.kyc_approve',
      'user',
      userId,
      { previousStatus },
    );

    this.logger.log(`KYC approved for user ${userId} by admin ${adminId}`);
    return saved;
  }

  async rejectKyc(
    userId: string,
    reason: string,
    adminId: string,
  ): Promise<UserOrmEntity> {
    const user = await this.getUser(userId);

    // Sanitize reason before storing (additional safety layer)
    const sanitizedReason = reason.trim().substring(0, 500);

    const previousStatus = user.kycStatus;
    user.kycStatus = 'rejected';
    user.updatedAt = new Date();

    const saved = await this.userRepository.save(user);

    await this.auditService.logAdminAction(
      adminId,
      'user.kyc_reject',
      'user',
      userId,
      { previousStatus, reason: sanitizedReason },
    );

    this.logger.log(
      `KYC rejected for user ${userId} by admin ${adminId}: ${sanitizedReason}`,
    );
    return saved;
  }

  // ==========================================
  // Dashboard & Metrics
  // ==========================================

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      kycPendingUsers,
      kycApprovedUsers,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: 'active' } }),
      this.userRepository.count({ where: { status: 'suspended' } }),
      this.userRepository.count({ where: { kycStatus: 'pending' } }),
      this.userRepository.count({ where: { kycStatus: 'approved' } }),
    ]);

    // TODO: Get transaction stats from transaction repository
    // For now, return placeholder values
    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      kycPendingUsers,
      kycApprovedUsers,
      totalTransactions: 0,
      pendingTransactions: 0,
      completedTransactions: 0,
      totalVolume: 0,
      todayVolume: 0,
    };
  }

  async recordMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' = 'gauge',
    dimensions?: Record<string, unknown>,
  ): Promise<void> {
    const metric = this.metricRepository.create({
      metricName: name,
      metricValue: value,
      metricType: type,
      dimensions,
    });
    await this.metricRepository.save(metric);
  }

  async getMetrics(
    name: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100,
  ): Promise<SystemMetricEntity[]> {
    const queryBuilder = this.metricRepository
      .createQueryBuilder('metric')
      .where('metric.metricName = :name', { name })
      .orderBy('metric.recordedAt', 'DESC')
      .take(limit);

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'metric.recordedAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    return queryBuilder.getMany();
  }

  // ==========================================
  // Reports
  // ==========================================

  async getUserGrowthReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; count: number }[]> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt) as date')
      .addSelect('COUNT(*) as count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));
  }

  async getKycStatusReport(): Promise<{ status: string; count: number }[]> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.kycStatus as status')
      .addSelect('COUNT(*) as count')
      .groupBy('user.kycStatus')
      .getRawMany();

    return result.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
    }));
  }
}
