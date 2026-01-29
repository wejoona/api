import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { SystemMetricEntity } from '../../infrastructure/persistence/typeorm/entities/system-metric.entity';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';

describe('AdminService - Dashboard Stats', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Repository<UserOrmEntity>>;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(UserOrmEntity),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SystemMetricEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: TransactionRepository,
          useValue: {
            getTransactionStats: jest.fn(),
            getTransactionTimeSeries: jest.fn(),
            getTransactionCountByType: jest.fn(),
            getTransactionCountByStatus: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAdminAction: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get(getRepositoryToken(UserOrmEntity));
    transactionRepository = module.get(TransactionRepository);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats with real transaction data', async () => {
      // Mock user stats
      userRepository.count
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(950) // active users
        .mockResolvedValueOnce(50) // suspended users
        .mockResolvedValueOnce(45) // kyc pending
        .mockResolvedValueOnce(800); // kyc approved

      // Mock transaction stats
      transactionRepository.getTransactionStats.mockResolvedValue({
        total: 5000,
        pending: 25,
        completed: 4800,
        failed: 175,
        totalVolume: 250000.5,
        todayVolume: 5420.75,
      });

      // Mock cache miss
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 1000,
        activeUsers: 950,
        suspendedUsers: 50,
        kycPendingUsers: 45,
        kycApprovedUsers: 800,
        totalTransactions: 5000,
        pendingTransactions: 25,
        completedTransactions: 4800,
        failedTransactions: 175,
        totalVolume: 250000.5,
        todayVolume: 5420.75,
      });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'admin:dashboard:stats',
        expect.any(Object),
        60000, // 1 minute in milliseconds
      );
    });

    it('should return cached stats when available', async () => {
      const cachedStats = {
        totalUsers: 1000,
        activeUsers: 950,
        suspendedUsers: 50,
        kycPendingUsers: 45,
        kycApprovedUsers: 800,
        totalTransactions: 5000,
        pendingTransactions: 25,
        completedTransactions: 4800,
        failedTransactions: 175,
        totalVolume: 250000.5,
        todayVolume: 5420.75,
      };

      cacheManager.get.mockResolvedValue(cachedStats);

      const result = await service.getDashboardStats();

      expect(result).toEqual(cachedStats);
      expect(userRepository.count).not.toHaveBeenCalled();
      expect(transactionRepository.getTransactionStats).not.toHaveBeenCalled();
    });
  });

  describe('getEnhancedDashboardStats', () => {
    it('should return enhanced stats with time-series data', async () => {
      // Mock cache miss
      cacheManager.get.mockResolvedValue(null);

      // Mock user stats
      userRepository.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(950)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(800);

      // Mock transaction stats
      transactionRepository.getTransactionStats.mockResolvedValue({
        total: 5000,
        pending: 25,
        completed: 4800,
        failed: 175,
        totalVolume: 250000.5,
        todayVolume: 5420.75,
      });

      // Mock time-series data
      transactionRepository.getTransactionTimeSeries.mockResolvedValue([
        { date: '2026-01-20', count: 150, volume: 8500.25 },
        { date: '2026-01-21', count: 165, volume: 9200.5 },
      ]);

      transactionRepository.getTransactionCountByType.mockResolvedValue({
        deposit: 1500,
        withdrawal: 1200,
        internal_transfer: 2000,
      });

      transactionRepository.getTransactionCountByStatus.mockResolvedValue({
        pending: 25,
        completed: 4800,
        failed: 175,
      });

      // Mock user growth time series
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2026-01-20', newUsers: 15 },
          { date: '2026-01-21', newUsers: 20 },
        ]),
        getCount: jest.fn().mockResolvedValue(950),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getEnhancedDashboardStats(7);

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('transactionTimeSeries');
      expect(result).toHaveProperty('userGrowthTimeSeries');
      expect(result).toHaveProperty('transactionsByType');
      expect(result).toHaveProperty('transactionsByStatus');
      expect(result.transactionTimeSeries).toHaveLength(2);
      expect(result.userGrowthTimeSeries).toHaveLength(2);
    });
  });

  describe('invalidateDashboardCache', () => {
    it('should clear all dashboard cache keys', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await service.invalidateDashboardCache();

      expect(cacheManager.del).toHaveBeenCalledTimes(4);
      expect(cacheManager.del).toHaveBeenCalledWith('admin:dashboard:stats');
      expect(cacheManager.del).toHaveBeenCalledWith(
        'admin:dashboard:enhanced:7',
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        'admin:dashboard:enhanced:30',
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        'admin:dashboard:enhanced:90',
      );
    });
  });
});
