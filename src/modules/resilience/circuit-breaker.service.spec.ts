import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreakerService,
  ExternalService,
  FallbackStrategy,
} from './circuit-breaker.service';
import { CircuitState, CircuitOpenError } from '@common/utils';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              // Return defaults for all config keys
              return defaultValue;
            }),
          } as any,
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    // Reset all circuits after each test
    service.resetAllCircuits();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize configurations for all services', () => {
      const circleConfig = service.getServiceConfig(ExternalService.CIRCLE);
      expect(circleConfig).toBeDefined();
      expect(circleConfig?.failureThreshold).toBeDefined();
      expect(circleConfig?.resetTimeout).toBeDefined();

      const yellowCardConfig = service.getServiceConfig(
        ExternalService.YELLOW_CARD,
      );
      expect(yellowCardConfig).toBeDefined();

      const twilioConfig = service.getServiceConfig(ExternalService.TWILIO);
      expect(twilioConfig).toBeDefined();
    });

    it('should initialize fallback configurations', () => {
      const circleFallback = service.getFallbackConfig(ExternalService.CIRCLE);
      expect(circleFallback).toBeDefined();
      expect(circleFallback?.strategy).toBe(FallbackStrategy.CACHE);

      const twilioFallback = service.getFallbackConfig(ExternalService.TWILIO);
      expect(twilioFallback?.strategy).toBe(FallbackStrategy.DEFAULT);
    });
  });

  describe('execute', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute(ExternalService.CIRCLE, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should track successful requests in metrics', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.execute(ExternalService.CIRCLE, operation);

      const metrics = service.getServiceMetrics(ExternalService.CIRCLE);
      expect(metrics?.totalRequests).toBe(1);
      expect(metrics?.successfulRequests).toBe(1);
      expect(metrics?.failedRequests).toBe(0);
    });

    it('should track failed requests in metrics', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(
        service.execute(ExternalService.CIRCLE, operation),
      ).rejects.toThrow('API Error');

      const metrics = service.getServiceMetrics(ExternalService.CIRCLE);
      expect(metrics?.totalRequests).toBe(1);
      expect(metrics?.successfulRequests).toBe(0);
      expect(metrics?.failedRequests).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));
      const config = service.getServiceConfig(ExternalService.CIRCLE);

      // Trigger failures up to threshold
      for (let i = 0; i < (config?.failureThreshold || 5); i++) {
        await service.execute(ExternalService.CIRCLE, operation).catch(() => {
          // Expected to fail
        });
      }

      // Next request should get CircuitOpenError
      await expect(
        service.execute(ExternalService.CIRCLE, operation),
      ).rejects.toThrow(CircuitOpenError);

      const health = service.getServiceHealth(ExternalService.CIRCLE);
      expect(health.circuitState).toBe(CircuitState.OPEN);
    });

    it('should use custom fallback when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));
      const fallback = jest.fn().mockResolvedValue('fallback-value');
      const config = service.getServiceConfig(ExternalService.CIRCLE);

      // Open the circuit
      for (let i = 0; i < (config?.failureThreshold || 5); i++) {
        await service.execute(ExternalService.CIRCLE, operation).catch(() => {
          // Expected to fail
        });
      }

      // Should use fallback
      const result = await service.execute(
        ExternalService.CIRCLE,
        operation,
        fallback,
      );

      expect(result).toBe('fallback-value');
      expect(fallback).toHaveBeenCalled();
    });

    it('should use default fallback for Twilio', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));
      const config = service.getServiceConfig(ExternalService.TWILIO);

      // Open the circuit
      for (let i = 0; i < (config?.failureThreshold || 5); i++) {
        await service.execute(ExternalService.TWILIO, operation).catch(() => {
          // Expected to fail
        });
      }

      // Should use default value
      const result = await service.execute(ExternalService.TWILIO, operation);
      expect(result).toHaveProperty('sid', 'FAILED');
      expect(result).toHaveProperty('status', 'failed');
    });

    it('should timeout long-running operations', async () => {
      const operation = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              const timeoutId = setTimeout(resolve, 10000);
              timeoutId.unref();
            }),
        );

      await expect(
        service.execute(ExternalService.CIRCLE, operation),
      ).rejects.toThrow(/timed out/);
    }, 10000);
  });

  describe('health monitoring', () => {
    it('should return health status for a service', () => {
      const health = service.getServiceHealth(ExternalService.CIRCLE);

      expect(health).toHaveProperty('service', ExternalService.CIRCLE);
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('circuitState');
      expect(health).toHaveProperty('failures');
      expect(health).toHaveProperty('successes');
      expect(health).toHaveProperty('averageResponseTime');
      expect(health).toHaveProperty('uptime');
    });

    it('should return health status for all services', () => {
      const allHealth = service.getAllServicesHealth();

      expect(allHealth).toBeInstanceOf(Array);
      expect(allHealth.length).toBeGreaterThan(0);
      expect(allHealth[0]).toHaveProperty('service');
      expect(allHealth[0]).toHaveProperty('healthy');
    });

    it('should calculate uptime percentage correctly', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 7 successes, 3 failures = 70% uptime
      for (let i = 0; i < 7; i++) {
        await service.execute(ExternalService.CIRCLE, successOp);
      }
      for (let i = 0; i < 3; i++) {
        await service.execute(ExternalService.CIRCLE, failOp).catch(() => {});
      }

      const health = service.getServiceHealth(ExternalService.CIRCLE);
      expect(health.uptime).toBe(70);
    });
  });

  describe('circuit management', () => {
    it('should manually open a circuit', () => {
      service.openCircuit(ExternalService.CIRCLE);

      const health = service.getServiceHealth(ExternalService.CIRCLE);
      expect(health.circuitState).toBe(CircuitState.OPEN);
    });

    it('should manually reset a circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));
      const config = service.getServiceConfig(ExternalService.CIRCLE);

      // Open the circuit
      for (let i = 0; i < (config?.failureThreshold || 5); i++) {
        await service.execute(ExternalService.CIRCLE, operation).catch(() => {
          // Expected to fail
        });
      }

      expect(
        service.getServiceHealth(ExternalService.CIRCLE).circuitState,
      ).toBe(CircuitState.OPEN);

      // Reset it
      service.resetCircuit(ExternalService.CIRCLE);

      expect(
        service.getServiceHealth(ExternalService.CIRCLE).circuitState,
      ).toBe(CircuitState.CLOSED);
    });

    it('should reset all circuits', () => {
      service.openCircuit(ExternalService.CIRCLE);
      service.openCircuit(ExternalService.TWILIO);

      service.resetAllCircuits();

      const allHealth = service.getAllServicesHealth();
      allHealth.forEach((health) => {
        expect(health.circuitState).toBe(CircuitState.CLOSED);
      });
    });

    it('should check if service is available', async () => {
      expect(service.isServiceAvailable(ExternalService.CIRCLE)).toBe(true);

      service.openCircuit(ExternalService.CIRCLE);

      expect(service.isServiceAvailable(ExternalService.CIRCLE)).toBe(false);
    });
  });

  describe('configuration updates', () => {
    it('should update service configuration at runtime', () => {
      const newConfig = {
        failureThreshold: 10,
        resetTimeout: 60000,
      };

      service.updateServiceConfig(ExternalService.CIRCLE, newConfig);

      const updatedConfig = service.getServiceConfig(ExternalService.CIRCLE);
      expect(updatedConfig?.failureThreshold).toBe(10);
      expect(updatedConfig?.resetTimeout).toBe(60000);
    });
  });

  describe('metrics', () => {
    it('should return metrics for a service', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.execute(ExternalService.CIRCLE, operation);

      const metrics = service.getServiceMetrics(ExternalService.CIRCLE);
      expect(metrics).toBeDefined();
      expect(metrics?.totalRequests).toBeGreaterThan(0);
    });

    it('should return metrics for all services', () => {
      const allMetrics = service.getAllMetrics();

      expect(allMetrics).toBeDefined();
      expect(Object.keys(allMetrics).length).toBeGreaterThan(0);
    });

    it('should track circuit open count', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API Error'));
      const config = service.getServiceConfig(ExternalService.CIRCLE);

      // Open the circuit
      for (let i = 0; i < (config?.failureThreshold || 5) + 2; i++) {
        await service.execute(ExternalService.CIRCLE, operation).catch(() => {
          // Expected to fail
        });
      }

      const metrics = service.getServiceMetrics(ExternalService.CIRCLE);
      expect(metrics?.circuitOpenCount).toBeGreaterThan(0);
    });
  });
});
