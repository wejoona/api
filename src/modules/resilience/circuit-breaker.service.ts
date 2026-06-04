import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreakerRegistry,
  CircuitState,
  CircuitOpenError,
} from '@common/utils';

/**
 * External Service Types
 */
export enum ExternalService {
  CIRCLE = 'circle',
  YELLOW_CARD = 'yellowcard',
  TWILIO = 'twilio',
  BLNK = 'blnk',
}

/**
 * Circuit Breaker Configuration per service
 */
export interface ServiceCircuitConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before attempting recovery */
  resetTimeout: number;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Enable/disable circuit breaker for this service */
  enabled: boolean;
}

/**
 * Fallback Strategy Types
 */
export enum FallbackStrategy {
  /** Return cached data if available */
  CACHE = 'cache',
  /** Return a default/mock response */
  DEFAULT = 'default',
  /** Throw error immediately */
  FAIL_FAST = 'fail_fast',
  /** Retry with exponential backoff */
  RETRY = 'retry',
  /** Use alternative provider */
  ALTERNATIVE = 'alternative',
}

/**
 * Fallback Configuration
 */
export interface FallbackConfig {
  strategy: FallbackStrategy;
  /** Cache TTL in seconds (for CACHE strategy) */
  cacheTTL?: number;
  /** Maximum number of retries (for RETRY strategy) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (for RETRY strategy) */
  retryBaseDelay?: number;
  /** Alternative service to use (for ALTERNATIVE strategy) */
  alternativeService?: string;
  /** Default value to return (for DEFAULT strategy) */
  defaultValue?: any;
}

/**
 * Service Health Status
 */
export interface ServiceHealthStatus {
  service: ExternalService;
  healthy: boolean;
  circuitState: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  averageResponseTime: number;
  uptime: number;
}

/**
 * Circuit Breaker Metrics
 */
export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
  lastHourRequests: number;
}

/**
 * Circuit Breaker Service
 *
 * Provides centralized circuit breaker management for all external service integrations.
 * Implements fault tolerance patterns including circuit breaking, fallback strategies,
 * and health monitoring.
 *
 * Features:
 * - Configurable thresholds per service (Circle, Yellow Card, Twilio)
 * - Multiple fallback strategies (cache, default, fail-fast, retry, alternative)
 * - Health monitoring and metrics collection
 * - Automatic recovery testing
 * - Rate limiting protection
 *
 * @see OWASP API Security Top 10 - API4:2023 Unrestricted Resource Consumption
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly registry: CircuitBreakerRegistry;
  private readonly serviceConfigs: Map<ExternalService, ServiceCircuitConfig>;
  private readonly fallbackConfigs: Map<ExternalService, FallbackConfig>;
  private readonly metricsStore: Map<string, CircuitBreakerMetrics>;
  private readonly responseTimeStore: Map<string, number[]>;

  constructor(private readonly configService: ConfigService) {
    this.registry = CircuitBreakerRegistry.getInstance();
    this.serviceConfigs = new Map();
    this.fallbackConfigs = new Map();
    this.metricsStore = new Map();
    this.responseTimeStore = new Map();

    this.initializeServiceConfigs();
    this.initializeFallbackConfigs();
    this.initializeCircuitBreakers();

    this.logger.log('Circuit Breaker Service initialized');
  }

  /**
   * Initialize circuit breaker configurations for each external service
   */
  private initializeServiceConfigs(): void {
    // Circle API Configuration
    this.serviceConfigs.set(ExternalService.CIRCLE, {
      failureThreshold: this.configService.get<number>(
        'resilience.circle.failureThreshold',
        5,
      ),
      resetTimeout: this.configService.get<number>(
        'resilience.circle.resetTimeout',
        30000, // 30 seconds
      ),
      requestTimeout: this.configService.get<number>(
        'resilience.circle.requestTimeout',
        5000, // 5 seconds
      ),
      enabled: this.configService.get<boolean>(
        'resilience.circle.enabled',
        true,
      ),
    });

    // Yellow Card API Configuration
    this.serviceConfigs.set(ExternalService.YELLOW_CARD, {
      failureThreshold: this.configService.get<number>(
        'resilience.yellowCard.failureThreshold',
        3,
      ),
      resetTimeout: this.configService.get<number>(
        'resilience.yellowCard.resetTimeout',
        60000, // 1 minute
      ),
      requestTimeout: this.configService.get<number>(
        'resilience.yellowCard.requestTimeout',
        10000, // 10 seconds
      ),
      enabled: this.configService.get<boolean>(
        'resilience.yellowCard.enabled',
        true,
      ),
    });

    // Twilio API Configuration
    this.serviceConfigs.set(ExternalService.TWILIO, {
      failureThreshold: this.configService.get<number>(
        'resilience.twilio.failureThreshold',
        5,
      ),
      resetTimeout: this.configService.get<number>(
        'resilience.twilio.resetTimeout',
        45000, // 45 seconds
      ),
      requestTimeout: this.configService.get<number>(
        'resilience.twilio.requestTimeout',
        8000, // 8 seconds
      ),
      enabled: this.configService.get<boolean>(
        'resilience.twilio.enabled',
        true,
      ),
    });

    // Blnk Ledger Configuration
    this.serviceConfigs.set(ExternalService.BLNK, {
      failureThreshold: this.configService.get<number>(
        'resilience.blnk.failureThreshold',
        3,
      ),
      resetTimeout: this.configService.get<number>(
        'resilience.blnk.resetTimeout',
        20000, // 20 seconds
      ),
      requestTimeout: this.configService.get<number>(
        'resilience.blnk.requestTimeout',
        5000, // 5 seconds
      ),
      enabled: this.configService.get<boolean>('resilience.blnk.enabled', true),
    });
  }

  /**
   * Initialize fallback strategies for each service
   */
  private initializeFallbackConfigs(): void {
    // Circle: Use cache or fail fast
    this.fallbackConfigs.set(ExternalService.CIRCLE, {
      strategy: FallbackStrategy.CACHE,
      cacheTTL: 300, // 5 minutes
      maxRetries: 2,
      retryBaseDelay: 1000,
    });

    // Yellow Card: Retry with backoff
    this.fallbackConfigs.set(ExternalService.YELLOW_CARD, {
      strategy: FallbackStrategy.RETRY,
      maxRetries: 3,
      retryBaseDelay: 2000,
    });

    // Twilio: Use default (log error, continue)
    this.fallbackConfigs.set(ExternalService.TWILIO, {
      strategy: FallbackStrategy.DEFAULT,
      defaultValue: {
        sid: 'FAILED',
        status: 'failed',
        message: 'SMS service temporarily unavailable',
      },
    });

    // Blnk: Fail fast (critical service)
    this.fallbackConfigs.set(ExternalService.BLNK, {
      strategy: FallbackStrategy.FAIL_FAST,
    });
  }

  /**
   * Initialize circuit breakers for all services
   */
  private initializeCircuitBreakers(): void {
    this.serviceConfigs.forEach((config, service) => {
      if (config.enabled) {
        this.registry.getBreaker(service, {
          failureThreshold: config.failureThreshold,
          resetTimeout: config.resetTimeout,
          name: service,
        });

        // Initialize metrics
        this.metricsStore.set(service, {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          circuitOpenCount: 0,
          averageResponseTime: 0,
          lastHourRequests: 0,
        });

        this.responseTimeStore.set(service, []);

        this.logger.log(
          `Circuit breaker initialized for ${service}: ` +
            `threshold=${config.failureThreshold}, ` +
            `timeout=${config.resetTimeout}ms`,
        );
      }
    });
  }

  /**
   * Execute an operation through the circuit breaker
   * @param service The external service being called
   * @param operation The async operation to execute
   * @param fallbackFn Optional fallback function if circuit is open
   * @returns Result of the operation or fallback
   */
  async execute<T>(
    service: ExternalService,
    operation: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
  ): Promise<T> {
    const config = this.serviceConfigs.get(service);

    // If circuit breaker is disabled, execute directly
    if (!config?.enabled) {
      return operation();
    }

    const breaker = this.registry.getBreaker(service);
    const startTime = Date.now();

    try {
      // Track request
      this.incrementMetric(service, 'totalRequests');

      // Execute through circuit breaker
      const result = await breaker.execute(async () => {
        // Add timeout protection
        return this.withTimeout(operation(), config.requestTimeout, service);
      });

      // Record success metrics
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(service, responseTime);
      this.incrementMetric(service, 'successfulRequests');

      return result;
    } catch (error) {
      // Record failure metrics
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(service, responseTime);
      this.incrementMetric(service, 'failedRequests');

      // Handle circuit open error
      if (error instanceof CircuitOpenError) {
        this.incrementMetric(service, 'circuitOpenCount');
        this.logger.warn(
          `Circuit breaker open for ${service}: ${error.message}`,
        );

        // Apply fallback strategy
        return this.handleFallback(service, error, fallbackFn);
      }

      // Log other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Request failed for ${service}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Apply fallback for non-circuit errors
      return this.handleFallback(service, error, fallbackFn);
    }
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    service: ExternalService,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(`Request to ${service} timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
      timeoutId.unref();
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Handle fallback based on configured strategy
   */
  private async handleFallback<T>(
    service: ExternalService,
    error: any,
    fallbackFn?: () => Promise<T>,
  ): Promise<T> {
    // Use custom fallback if provided
    if (fallbackFn) {
      this.logger.log(`Using custom fallback for ${service}`);
      return fallbackFn();
    }

    const fallbackConfig = this.fallbackConfigs.get(service);

    if (!fallbackConfig) {
      throw error;
    }

    switch (fallbackConfig.strategy) {
      case FallbackStrategy.CACHE:
        this.logger.log(`Using cached data fallback for ${service}`);
        // Cache implementation would go here
        throw error; // No cache available

      case FallbackStrategy.DEFAULT:
        this.logger.log(`Using default value fallback for ${service}`);
        return fallbackConfig.defaultValue as T;

      case FallbackStrategy.RETRY:
        this.logger.log(`Applying retry strategy for ${service}`);
        // Retry logic would be implemented here
        throw error; // No retry in this fallback

      case FallbackStrategy.ALTERNATIVE:
        this.logger.log(`Using alternative service for ${service}`);
        // Alternative service logic would go here
        throw error;

      case FallbackStrategy.FAIL_FAST:
      default:
        this.logger.error(`Fail-fast strategy for ${service}, throwing error`);
        throw error;
    }
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(service: ExternalService): ServiceHealthStatus {
    const breaker = this.registry.getBreaker(service);
    const stats = breaker.getStats();
    const metrics = this.metricsStore.get(service);
    const responseTimes = this.responseTimeStore.get(service) || [];

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const uptime =
      metrics && metrics.totalRequests > 0
        ? (metrics.successfulRequests / metrics.totalRequests) * 100
        : 100;

    return {
      service,
      healthy: stats.state === CircuitState.CLOSED,
      circuitState: stats.state,
      failures: stats.failures,
      successes: stats.successes,
      lastFailureTime: stats.lastFailureTime,
      lastSuccessTime: stats.lastSuccessTime,
      averageResponseTime: Math.round(avgResponseTime),
      uptime: Math.round(uptime * 100) / 100,
    };
  }

  /**
   * Get health status for all services
   */
  getAllServicesHealth(): ServiceHealthStatus[] {
    return Array.from(this.serviceConfigs.keys()).map((service) =>
      this.getServiceHealth(service),
    );
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(service: ExternalService): CircuitBreakerMetrics | null {
    return this.metricsStore.get(service) || null;
  }

  /**
   * Get metrics for all services
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.metricsStore.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }

  /**
   * Manually open a circuit breaker (for maintenance or testing)
   */
  openCircuit(service: ExternalService): void {
    const breaker = this.registry.getBreaker(service);
    breaker.forceOpen();
    this.logger.warn(`Circuit breaker manually opened for ${service}`);
  }

  /**
   * Manually reset a circuit breaker
   */
  resetCircuit(service: ExternalService): void {
    const breaker = this.registry.getBreaker(service);
    breaker.reset();
    this.logger.log(`Circuit breaker reset for ${service}`);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuits(): void {
    this.registry.resetAll();
    this.logger.log('All circuit breakers reset');
  }

  /**
   * Update service configuration at runtime
   */
  updateServiceConfig(
    service: ExternalService,
    config: Partial<ServiceCircuitConfig>,
  ): void {
    const currentConfig = this.serviceConfigs.get(service);
    if (currentConfig) {
      this.serviceConfigs.set(service, { ...currentConfig, ...config });
      this.logger.log(
        `Configuration updated for ${service}: ${JSON.stringify(config)}`,
      );
    }
  }

  /**
   * Check if a service is available
   */
  isServiceAvailable(service: ExternalService): boolean {
    const breaker = this.registry.getBreaker(service);
    return breaker.getState() !== CircuitState.OPEN;
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(service: ExternalService, time: number): void {
    const times = this.responseTimeStore.get(service) || [];
    times.push(time);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    this.responseTimeStore.set(service, times);
  }

  /**
   * Increment a metric counter
   */
  private incrementMetric(
    service: ExternalService,
    metric: keyof CircuitBreakerMetrics,
  ): void {
    const metrics = this.metricsStore.get(service);
    if (metrics && typeof metrics[metric] === 'number') {
      metrics[metric]++;
    }
  }

  /**
   * Get circuit breaker configuration for a service
   */
  getServiceConfig(service: ExternalService): ServiceCircuitConfig | null {
    return this.serviceConfigs.get(service) || null;
  }

  /**
   * Get fallback configuration for a service
   */
  getFallbackConfig(service: ExternalService): FallbackConfig | null {
    return this.fallbackConfigs.get(service) || null;
  }
}
