import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AMLCFTService } from '../aml-cft.service';
import { TransactionOrmEntity } from '../../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../../user/infrastructure/orm-entities/user.orm-entity';
import { ComplianceAlertOrmEntity } from '../../../infrastructure/orm-entities';

describe('AMLCFTService', () => {
  let service: AMLCFTService;
  let transactionRepository: jest.Mocked<Repository<TransactionOrmEntity>>;
  let userRepository: jest.Mocked<Repository<UserOrmEntity>>;
  let alertRepository: jest.Mocked<Repository<ComplianceAlertOrmEntity>>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AMLCFTService,
        {
          provide: getRepositoryToken(TransactionOrmEntity),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrmEntity),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplianceAlertOrmEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AMLCFTService>(AMLCFTService);
    transactionRepository = module.get(getRepositoryToken(TransactionOrmEntity));
    userRepository = module.get(getRepositoryToken(UserOrmEntity));
    alertRepository = module.get(getRepositoryToken(ComplianceAlertOrmEntity));
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeTransaction', () => {
    it('should approve low-risk transaction', async () => {
      const userId = 'user-123';
      const amount = 100; // Small amount

      // Mock low velocity
      transactionRepository.find.mockResolvedValue([]);

      // Mock user with low-risk country
      userRepository.findOne.mockResolvedValue({
        id: userId,
        countryCode: 'CI', // Ivory Coast (WAEMU)
        kycStatus: 'approved',
      } as UserOrmEntity);

      const result = await service.analyzeTransaction(userId, amount);

      expect(result.approved).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.requiresManualReview).toBe(false);
    });

    it('should flag high velocity transaction', async () => {
      const userId = 'user-123';
      const amount = 500;

      // Mock high velocity (6 transactions in last hour)
      const mockTransactions = Array(6)
        .fill(null)
        .map((_, i) => ({
          id: `tx-${i}`,
          walletId: userId,
          amount: 100,
          type: 'transfer',
          status: 'completed',
          createdAt: new Date(),
        })) as TransactionOrmEntity[];

      transactionRepository.find.mockResolvedValue(mockTransactions);

      userRepository.findOne.mockResolvedValue({
        id: userId,
        countryCode: 'CI',
        kycStatus: 'approved',
      } as UserOrmEntity);

      configService.get.mockReturnValue(5); // Velocity threshold

      // Mock alert creation for high-risk scenarios
      const mockAlert = { id: 'alert-123', userId, severity: 'high' } as ComplianceAlertOrmEntity;
      alertRepository.create.mockReturnValue(mockAlert);
      alertRepository.save.mockResolvedValue(mockAlert);

      const result = await service.analyzeTransaction(userId, amount);

      expect(result.flags).toContain('velocity_exceeded');
      expect(result.riskScore).toBeGreaterThan(25);
    });

    it('should block critical risk transaction', async () => {
      const userId = 'user-123';
      const amount = 5000;

      // Mock high-risk country
      userRepository.findOne.mockResolvedValue({
        id: userId,
        countryCode: 'IR', // Iran (sanctioned)
        kycStatus: 'approved',
      } as UserOrmEntity);

      transactionRepository.find.mockResolvedValue([]);

      // Mock alert creation for critical-risk scenarios
      const mockAlert = { id: 'alert-456', userId, severity: 'critical' } as ComplianceAlertOrmEntity;
      alertRepository.create.mockReturnValue(mockAlert);
      alertRepository.save.mockResolvedValue(mockAlert);

      const result = await service.analyzeTransaction(userId, amount);

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.flags).toContain('high_risk_geography');
    });
  });

  describe('detectStructuring', () => {
    it('should detect structuring pattern', async () => {
      const userId = 'user-123';

      // Mock 5 transactions of similar amounts just below threshold
      const mockTransactions = [
        { id: 'tx-1', amount: 190, createdAt: new Date() },
        { id: 'tx-2', amount: 190, createdAt: new Date() },
        { id: 'tx-3', amount: 190, createdAt: new Date() },
        { id: 'tx-4', amount: 190, createdAt: new Date() },
        { id: 'tx-5', amount: 190, createdAt: new Date() },
      ] as TransactionOrmEntity[];

      transactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.detectStructuring(userId);

      expect(result.consistentAmounts).toBe(true);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.transactionCount).toBe(5);
      expect(result.totalAmount).toBe(950);
    });

    it('should not flag legitimate varying amounts', async () => {
      const userId = 'user-123';

      // Mock transactions with natural variation
      const mockTransactions = [
        { id: 'tx-1', amount: 123.45, createdAt: new Date() },
        { id: 'tx-2', amount: 567.89, createdAt: new Date() },
        { id: 'tx-3', amount: 234.56, createdAt: new Date() },
      ] as TransactionOrmEntity[];

      transactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.detectStructuring(userId);

      expect(result.consistentAmounts).toBe(false);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  describe('checkVelocity', () => {
    it('should detect velocity anomaly', async () => {
      const userId = 'user-123';

      // Mock 10 transactions in last hour
      const mockTransactions = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `tx-${i}`,
          walletId: userId,
          amount: 100,
          createdAt: new Date(),
        })) as TransactionOrmEntity[];

      transactionRepository.find.mockResolvedValue(mockTransactions);
      configService.get.mockReturnValue(5); // Threshold = 5

      const result = await service.checkVelocity(userId, 60);

      expect(result.exceeded).toBe(true);
      expect(result.transactionCount).toBe(10);
      expect(result.threshold).toBe(5);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should pass normal velocity', async () => {
      const userId = 'user-123';

      // Mock 3 transactions in last hour
      const mockTransactions = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `tx-${i}`,
          amount: 100,
          createdAt: new Date(),
        })) as TransactionOrmEntity[];

      transactionRepository.find.mockResolvedValue(mockTransactions);
      configService.get.mockReturnValue(5);

      const result = await service.checkVelocity(userId, 60);

      expect(result.exceeded).toBe(false);
      expect(result.transactionCount).toBe(3);
    });
  });

  describe('assessGeographicRisk', () => {
    it('should assess WAEMU country as low risk', () => {
      const result = service.assessGeographicRisk('CI'); // Ivory Coast

      expect(result.riskLevel).toBe('low');
      expect(result.isSanctioned).toBe(false);
      expect(result.riskScore).toBeLessThan(25);
    });

    it('should assess sanctioned country as critical risk', () => {
      const result = service.assessGeographicRisk('IR'); // Iran

      expect(result.riskLevel).toBe('critical');
      expect(result.isSanctioned).toBe(true);
      expect(result.riskScore).toBeGreaterThan(75);
    });

    it('should assess non-WAEMU African country as medium risk', () => {
      const result = service.assessGeographicRisk('NG'); // Nigeria

      expect(result.riskLevel).toBe('medium');
      expect(result.isSanctioned).toBe(false);
      expect(result.riskScore).toBeGreaterThan(25);
      expect(result.riskScore).toBeLessThan(50);
    });
  });

  describe('createAlert', () => {
    it('should create compliance alert', async () => {
      const userId = 'user-123';

      const mockAlert = {
        id: 'alert-123',
        userId,
        severity: 'critical',
      } as ComplianceAlertOrmEntity;

      alertRepository.create.mockReturnValue(mockAlert);
      alertRepository.save.mockResolvedValue(mockAlert);

      // Create high-risk scenario to trigger alert (sanctioned country)
      transactionRepository.find.mockResolvedValue([]);
      userRepository.findOne.mockResolvedValue({
        id: userId,
        countryCode: 'IR', // Sanctioned country triggers critical risk + alert
      } as UserOrmEntity);

      await service.analyzeTransaction(userId, 1000);

      // Verify event emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'compliance.alert.created',
        expect.objectContaining({
          userId,
        }),
      );
    });
  });

  describe('getUserRiskProfile', () => {
    it('should calculate comprehensive risk profile', async () => {
      const userId = 'user-123';

      alertRepository.find.mockResolvedValue([
        { id: 'alert-1', severity: 'medium' },
        { id: 'alert-2', severity: 'high' },
      ] as ComplianceAlertOrmEntity[]);

      transactionRepository.find.mockResolvedValue([
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ] as TransactionOrmEntity[]);

      const profile = await service.getUserRiskProfile(userId);

      expect(profile).toHaveProperty('overallRiskScore');
      expect(profile).toHaveProperty('riskLevel');
      expect(profile).toHaveProperty('flags');
      expect(profile).toHaveProperty('recentAlerts');
      expect(profile).toHaveProperty('transactionVelocity');
      expect(profile).toHaveProperty('structuringRisk');
    });
  });
});
