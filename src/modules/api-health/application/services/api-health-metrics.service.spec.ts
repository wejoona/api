import { ApiHealthMetricsService } from './api-health-metrics.service';
import { Counter, Histogram, Gauge } from 'prom-client';
import {
  CircleHealthCollector,
  YellowCardHealthCollector,
  TwilioHealthCollector,
} from '../../infrastructure/collectors';
import { ApiProvider } from '../../domain/entities/api-health-metric.entity';

describe('ApiHealthMetricsService', () => {
  let service: ApiHealthMetricsService;
  let circleCollector: jest.Mocked<CircleHealthCollector>;
  let yellowCardCollector: jest.Mocked<YellowCardHealthCollector>;
  let twilioCollector: jest.Mocked<TwilioHealthCollector>;

  // Mock Prometheus metrics
  let mockAvailabilityGauge: jest.Mocked<Gauge<string>>;
  let mockLatencyHistogram: jest.Mocked<Histogram<string>>;
  let mockChecksCounter: jest.Mocked<Counter<string>>;
  let mockErrorsCounter: jest.Mocked<Counter<string>>;
  let mockStatusGauge: jest.Mocked<Gauge<string>>;
  let mockTwilioDeliveryRate: jest.Mocked<Gauge<string>>;
  let mockTwilioMessagesSent: jest.Mocked<Counter<string>>;
  let mockTwilioMessagesFailed: jest.Mocked<Counter<string>>;

  beforeEach(async () => {
    // Create mock collectors
    circleCollector = {
      getProvider: jest.fn().mockReturnValue(ApiProvider.CIRCLE),
      checkHealth: jest.fn(),
    } as any;

    yellowCardCollector = {
      getProvider: jest.fn().mockReturnValue(ApiProvider.YELLOW_CARD),
      checkHealth: jest.fn(),
    } as any;

    twilioCollector = {
      getProvider: jest.fn().mockReturnValue(ApiProvider.TWILIO),
      checkHealth: jest.fn(),
    } as any;

    // Create mock Prometheus metrics
    mockAvailabilityGauge = {
      set: jest.fn(),
    } as any;

    mockLatencyHistogram = {
      observe: jest.fn(),
    } as any;

    mockChecksCounter = {
      inc: jest.fn(),
    } as any;

    mockErrorsCounter = {
      inc: jest.fn(),
    } as any;

    mockStatusGauge = {
      set: jest.fn(),
    } as any;

    mockTwilioDeliveryRate = {
      set: jest.fn(),
    } as any;

    mockTwilioMessagesSent = {
      inc: jest.fn(),
    } as any;

    mockTwilioMessagesFailed = {
      inc: jest.fn(),
    } as any;

    service = new ApiHealthMetricsService(
      mockAvailabilityGauge,
      mockLatencyHistogram,
      mockChecksCounter,
      mockErrorsCounter,
      mockStatusGauge,
      mockTwilioDeliveryRate,
      mockTwilioMessagesSent,
      mockTwilioMessagesFailed,
      [circleCollector, yellowCardCollector, twilioCollector],
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectAllMetrics', () => {
    it('should collect metrics from all collectors', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      yellowCardCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.YELLOW_CARD,
        endpoint: '/business/rates',
        available: true,
        latencyMs: 450,
        statusCode: 200,
      });

      twilioCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.TWILIO,
        endpoint: '/2010-04-01/Accounts/test.json',
        available: true,
        latencyMs: 180,
        statusCode: 200,
      });

      await service.collectAllMetrics();

      expect(circleCollector.checkHealth).toHaveBeenCalled();
      expect(yellowCardCollector.checkHealth).toHaveBeenCalled();
      expect(twilioCollector.checkHealth).toHaveBeenCalled();
    });

    it('should record availability metrics', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      await service.collectAllMetrics();

      expect(mockAvailabilityGauge.set).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        1,
      );
    });

    it('should record unavailability metrics', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: false,
        latencyMs: 5000,
        errorMessage: 'Connection timeout',
      });

      await service.collectAllMetrics();

      expect(mockAvailabilityGauge.set).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        0,
      );

      expect(mockErrorsCounter.inc).toHaveBeenCalledWith({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        error: 'Connection timeout',
      });
    });

    it('should record latency metrics', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      await service.collectAllMetrics();

      expect(mockLatencyHistogram.observe).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        0.25, // 250ms in seconds
      );
    });

    it('should record healthy status for fast responses', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      await service.collectAllMetrics();

      expect(mockStatusGauge.set).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        2, // HEALTHY
      );
    });

    it('should record degraded status for slow responses', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 2500,
        statusCode: 200,
      });

      await service.collectAllMetrics();

      expect(mockStatusGauge.set).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        1, // DEGRADED
      );
    });

    it('should record down status for unavailable APIs', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: false,
        latencyMs: 5000,
        errorMessage: 'Connection refused',
      });

      await service.collectAllMetrics();

      expect(mockStatusGauge.set).toHaveBeenCalledWith(
        { provider: ApiProvider.CIRCLE, endpoint: '/v1/configuration' },
        0, // DOWN
      );
    });

    it('should handle collector errors gracefully', async () => {
      circleCollector.checkHealth.mockRejectedValue(
        new Error('Collector failed'),
      );

      await service.collectAllMetrics();

      expect(mockErrorsCounter.inc).toHaveBeenCalledWith({
        provider: ApiProvider.CIRCLE,
        endpoint: 'unknown',
        error: 'Collector failed',
      });
    });
  });

  describe('checkProviderHealth', () => {
    it('should check health for a specific provider', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      await service.checkProviderHealth(ApiProvider.CIRCLE);

      expect(circleCollector.checkHealth).toHaveBeenCalled();
      expect(yellowCardCollector.checkHealth).not.toHaveBeenCalled();
      expect(twilioCollector.checkHealth).not.toHaveBeenCalled();
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        service.checkProviderHealth('unknown' as ApiProvider),
      ).rejects.toThrow('No health collector found for provider');
    });
  });

  describe('recordTwilioMessage', () => {
    it('should record sent messages', () => {
      service.recordTwilioMessage('sent');

      expect(mockTwilioMessagesSent.inc).toHaveBeenCalledWith({
        status: 'sent',
        error_code: 'none',
      });
    });

    it('should record delivered messages', () => {
      service.recordTwilioMessage('delivered');

      expect(mockTwilioMessagesSent.inc).toHaveBeenCalledWith({
        status: 'delivered',
        error_code: 'none',
      });
    });

    it('should record failed messages', () => {
      service.recordTwilioMessage('failed', '30001');

      expect(mockTwilioMessagesFailed.inc).toHaveBeenCalledWith({
        status: 'failed',
        error_code: '30001',
      });
    });

    it('should record undelivered messages', () => {
      service.recordTwilioMessage('undelivered', '30002');

      expect(mockTwilioMessagesFailed.inc).toHaveBeenCalledWith({
        status: 'undelivered',
        error_code: '30002',
      });
    });
  });

  describe('getCurrentHealth', () => {
    it('should return current health for all providers', async () => {
      circleCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.CIRCLE,
        endpoint: '/v1/configuration',
        available: true,
        latencyMs: 250,
        statusCode: 200,
      });

      yellowCardCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.YELLOW_CARD,
        endpoint: '/business/rates',
        available: true,
        latencyMs: 450,
        statusCode: 200,
      });

      twilioCollector.checkHealth.mockResolvedValue({
        provider: ApiProvider.TWILIO,
        endpoint: '/2010-04-01/Accounts/test.json',
        available: true,
        latencyMs: 180,
        statusCode: 200,
      });

      const health = await service.getCurrentHealth();

      expect(health).toHaveProperty(ApiProvider.CIRCLE);
      expect(health).toHaveProperty(ApiProvider.YELLOW_CARD);
      expect(health).toHaveProperty(ApiProvider.TWILIO);

      expect(health[ApiProvider.CIRCLE]).toMatchObject({
        provider: ApiProvider.CIRCLE,
        available: true,
        latencyMs: 250,
      });
    });
  });
});
