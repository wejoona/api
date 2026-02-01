import { Test, TestingModule } from '@nestjs/testing';
import { BusinessMetricsService } from './business-metrics.service';

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  // Mock Prometheus metrics
  const mockGauge = {
    set: jest.fn(),
  };

  const mockCounter = {
    inc: jest.fn(),
  };

  const mockHistogram = {
    observe: jest.fn(),
  };

  const mockSummary = {
    observe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessMetricsService,
        // Transactions Per Minute
        { provide: 'business_transactions_per_minute', useValue: mockGauge },
        { provide: 'business_transactions_rate', useValue: mockCounter },
        // Average Transaction Value
        {
          provide: 'business_transaction_value_summary',
          useValue: mockSummary,
        },
        { provide: 'business_transaction_value_total', useValue: mockCounter },
        { provide: 'business_transaction_count_total', useValue: mockCounter },
        { provide: 'business_avg_transaction_value', useValue: mockGauge },
        // KYC
        { provide: 'business_kyc_submissions_total', useValue: mockCounter },
        { provide: 'business_kyc_completions_total', useValue: mockCounter },
        { provide: 'business_kyc_rejections_total', useValue: mockCounter },
        { provide: 'business_kyc_completion_rate', useValue: mockGauge },
        {
          provide: 'business_kyc_processing_duration_seconds',
          useValue: mockHistogram,
        },
        // User Registration
        { provide: 'business_user_registrations_rate', useValue: mockCounter },
        { provide: 'business_registrations_per_hour', useValue: mockGauge },
        { provide: 'business_user_activations_total', useValue: mockCounter },
        { provide: 'business_user_activation_rate', useValue: mockGauge },
        // API Latency
        {
          provide: 'business_api_latency_by_endpoint',
          useValue: mockHistogram,
        },
        { provide: 'business_api_success_rate', useValue: mockGauge },
        { provide: 'business_api_requests_by_endpoint', useValue: mockCounter },
        { provide: 'business_api_errors_by_endpoint', useValue: mockCounter },
        // Additional
        { provide: 'business_revenue_total_usd', useValue: mockCounter },
        { provide: 'business_active_wallets_gauge', useValue: mockGauge },
        { provide: 'business_failed_transactions_rate', useValue: mockCounter },
        { provide: 'business_transaction_success_rate', useValue: mockGauge },
        {
          provide: 'business_mobile_money_provider_usage',
          useValue: mockCounter,
        },
        {
          provide: 'business_customer_lifetime_value',
          useValue: mockHistogram,
        },
      ],
    }).compile();

    service = module.get<BusinessMetricsService>(BusinessMetricsService);

    // Clear all mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.resetCaches();
  });

  describe('Transactions Per Minute (TPM)', () => {
    it('should record transaction for TPM calculation', () => {
      service.recordTransactionForRate('transfer', 'completed', 'USD');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: 'transfer',
        status: 'completed',
        currency: 'USD',
      });

      expect(mockGauge.set).toHaveBeenCalledWith(1);
      expect(service.getCurrentTPM()).toBe(1);
    });

    it('should track multiple transactions in TPM window', () => {
      service.recordTransactionForRate('transfer', 'completed', 'USD');
      service.recordTransactionForRate('deposit', 'completed', 'USD');
      service.recordTransactionForRate('withdrawal', 'completed', 'USD');

      expect(service.getCurrentTPM()).toBe(3);
      expect(mockGauge.set).toHaveBeenLastCalledWith(3);
    });

    it('should clean old transactions from TPM window', () => {
      // Mock Date.now() to control time
      const now = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => now);

      service.recordTransactionForRate('transfer', 'completed', 'USD');

      // Move time forward 61 seconds (outside 1-minute window)
      jest.spyOn(Date, 'now').mockImplementation(() => now + 61000);

      service.handleTransactionsPerMinuteUpdate();

      expect(service.getCurrentTPM()).toBe(0);

      jest.restoreAllMocks();
    });

    it('should update TPM gauge periodically', () => {
      service.recordTransactionForRate('transfer', 'completed', 'USD');
      service.recordTransactionForRate('transfer', 'completed', 'USD');

      service.handleTransactionsPerMinuteUpdate();

      expect(mockGauge.set).toHaveBeenCalledWith(2);
    });
  });

  describe('Average Transaction Value', () => {
    it('should record transaction value', () => {
      service.recordTransactionValue(150.5, 'transfer', 'USD');

      expect(mockSummary.observe).toHaveBeenCalledWith(
        { type: 'transfer', currency: 'USD' },
        150.5,
      );

      expect(mockCounter.inc).toHaveBeenCalledWith(
        { type: 'transfer', currency: 'USD' },
        150.5,
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: 'transfer',
        currency: 'USD',
      });
    });

    it('should update average transaction value', () => {
      service.updateAverageTransactionValue(1000, 10, 'transfer', 'USD');

      expect(mockGauge.set).toHaveBeenCalledWith(
        { type: 'transfer', currency: 'USD' },
        100,
      );
    });

    it('should not update average with zero count', () => {
      service.updateAverageTransactionValue(1000, 0, 'transfer', 'USD');

      expect(mockGauge.set).not.toHaveBeenCalled();
    });
  });

  describe('KYC Completion Rate', () => {
    it('should record KYC submission', () => {
      service.recordKycSubmission('tier2', 'CI');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        level: 'tier2',
        country: 'CI',
      });
    });

    it('should record KYC completion', () => {
      const durationMs = 5000;

      service.recordKycCompletion('tier2', 'CI', durationMs);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        level: 'tier2',
        country: 'CI',
      });

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { level: 'tier2', country: 'CI', status: 'completed' },
        5,
      );
    });

    it('should record KYC rejection', () => {
      const durationMs = 3000;

      service.recordKycRejection('tier2', 'CI', 'document_unclear', durationMs);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        level: 'tier2',
        country: 'CI',
        reason: 'document_unclear',
      });

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { level: 'tier2', country: 'CI', status: 'rejected' },
        3,
      );
    });

    it('should calculate KYC completion rate', () => {
      service.updateKycCompletionRate(85, 100, 'tier2');

      expect(mockGauge.set).toHaveBeenCalledWith({ level: 'tier2' }, 85);
    });

    it('should not calculate rate with zero submissions', () => {
      service.updateKycCompletionRate(0, 0, 'tier2');

      expect(mockGauge.set).not.toHaveBeenCalled();
    });
  });

  describe('User Registration Rate', () => {
    it('should record user registration', () => {
      service.recordUserRegistration('mobile', 'CI', 'active');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        channel: 'mobile',
        country: 'CI',
        status: 'active',
      });
    });

    it('should record user activation', () => {
      service.recordUserActivation('mobile', 'CI', 'first_transaction');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        channel: 'mobile',
        country: 'CI',
        activation_type: 'first_transaction',
      });
    });

    it('should update registrations per hour', () => {
      service.updateRegistrationsPerHour(45, 'mobile');

      expect(mockGauge.set).toHaveBeenCalledWith({ channel: 'mobile' }, 45);
    });

    it('should calculate user activation rate', () => {
      service.updateUserActivationRate(320, 400, 'mobile');

      expect(mockGauge.set).toHaveBeenCalledWith({ channel: 'mobile' }, 80);
    });

    it('should not calculate activation rate with zero registrations', () => {
      service.updateUserActivationRate(0, 0, 'mobile');

      expect(mockGauge.set).not.toHaveBeenCalled();
    });
  });

  describe('API Latency by Endpoint', () => {
    it('should record API latency for successful request', () => {
      service.recordApiLatency('/api/v1/transfers', 'POST', 200, 150);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { endpoint: '/api/v1/transfers', method: 'POST', status: '200' },
        0.15,
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        endpoint: '/api/v1/transfers',
        method: 'POST',
        status: '200',
      });
    });

    it('should record API error', () => {
      service.recordApiLatency('/api/v1/transfers', 'POST', 500, 200);

      expect(mockCounter.inc).toHaveBeenCalledTimes(2); // requests + errors

      expect(mockCounter.inc).toHaveBeenCalledWith({
        endpoint: '/api/v1/transfers',
        method: 'POST',
        status: '500',
      });
    });

    it('should update API success rate', () => {
      service.updateApiSuccessRate(950, 1000, '/api/v1/transfers');

      expect(mockGauge.set).toHaveBeenCalledWith(
        { endpoint: '/api/v1/transfers' },
        95,
      );
    });

    it('should not update success rate with zero requests', () => {
      service.updateApiSuccessRate(0, 0, '/api/v1/transfers');

      expect(mockGauge.set).not.toHaveBeenCalled();
    });
  });

  describe('Additional Business Metrics', () => {
    it('should record revenue', () => {
      service.recordRevenue(5.5, 'transfer_fee', 'USD');

      expect(mockCounter.inc).toHaveBeenCalledWith(
        { source: 'transfer_fee', currency: 'USD' },
        5.5,
      );
    });

    it('should update active wallets', () => {
      service.updateActiveWallets(1250, '24h');

      expect(mockGauge.set).toHaveBeenCalledWith({ timeframe: '24h' }, 1250);
    });

    it('should record failed transaction', () => {
      service.recordFailedTransaction('transfer', 'insufficient_funds');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: 'transfer',
        reason: 'insufficient_funds',
      });
    });

    it('should update transaction success rate', () => {
      service.updateTransactionSuccessRate(950, 1000, 'transfer');

      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'transfer' }, 0.95);
    });

    it('should record mobile money provider usage', () => {
      service.recordMobileMoneyProviderUsage('orange_money', 'deposit', 'CI');

      expect(mockCounter.inc).toHaveBeenCalledWith({
        provider: 'orange_money',
        operation: 'deposit',
        country: 'CI',
      });
    });

    it('should record customer lifetime value', () => {
      service.recordCustomerLifetimeValue(5000, '2024-Q1', 'CI');

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { cohort: '2024-Q1', country: 'CI' },
        5000,
      );
    });
  });

  describe('Initialization', () => {
    it('should initialize gauges with zero values on module init', () => {
      service.onModuleInit();

      expect(mockGauge.set).toHaveBeenCalledWith(0);
      expect(mockGauge.set).toHaveBeenCalledWith(1.0);
    });
  });

  describe('Cache Management', () => {
    it('should reset caches', () => {
      service.recordTransactionForRate('transfer', 'completed', 'USD');
      service.recordTransactionForRate('transfer', 'completed', 'USD');

      expect(service.getCurrentTPM()).toBe(2);

      service.resetCaches();

      expect(service.getCurrentTPM()).toBe(0);
    });
  });
});
