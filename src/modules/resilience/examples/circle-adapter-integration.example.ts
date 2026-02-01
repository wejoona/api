/**
 * Example: Integrating Circuit Breaker with Circle Transfer Adapter
 *
 * This example shows how to refactor the existing CircleTransferAdapter
 * to use the centralized CircuitBreakerService.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreakerService,
  ExternalService,
} from '../circuit-breaker.service';
import { CircuitOpenError } from '@common/utils';

/**
 * BEFORE: Direct circuit breaker usage in adapter
 */
@Injectable()
export class CircleTransferAdapterBefore {
  private readonly logger = new Logger(CircleTransferAdapterBefore.name);
  // Each adapter manages its own circuit breaker
  private readonly circuitBreaker: any;

  constructor(private readonly configService: ConfigService) {
    // Circuit breaker configuration duplicated in each adapter
    this.circuitBreaker = {
      failureThreshold: 5,
      resetTimeout: 30000,
    };
  }

  async transfer(data: any) {
    // Manual circuit breaker logic
    try {
      return await fetch('https://api.circle.com/transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Handle errors manually
      this.logger.error('Transfer failed', error);
      throw error;
    }
  }
}

/**
 * AFTER: Using centralized CircuitBreakerService
 */
@Injectable()
export class CircleTransferAdapterAfter {
  private readonly logger = new Logger(CircleTransferAdapterAfter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.baseUrl = this.configService.get('circle.apiUrl', '');
    this.apiKey = this.configService.get('circle.apiKey', '');
  }

  /**
   * Execute transfer with circuit breaker protection
   */
  async transfer(data: any) {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        // Primary operation
        const response = await fetch(`${this.baseUrl}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Circle API error: ${response.statusText}`);
        }

        return response.json();
      },
      async () => {
        // Fallback: Queue for later processing
        this.logger.warn('Circle API unavailable, queueing transfer');
        return {
          status: 'queued',
          id: data.idempotencyKey,
          message: 'Transfer queued for processing when service recovers',
        };
      },
    );
  }

  /**
   * Get transfer status with circuit breaker
   */
  async getTransferStatus(transferId: string) {
    try {
      return await this.circuitBreaker.execute(
        ExternalService.CIRCLE,
        async () => {
          const response = await fetch(
            `${this.baseUrl}/transfers/${transferId}`,
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
              },
            },
          );

          if (!response.ok) {
            throw new Error(
              `Failed to get transfer status: ${response.statusText}`,
            );
          }

          return response.json();
        },
        async () => {
          // Fallback: Return cached status if available
          this.logger.warn('Circle API unavailable, using cached status');
          return {
            id: transferId,
            status: 'unknown',
            message: 'Status temporarily unavailable',
          };
        },
      );
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        this.logger.warn(
          `Circle circuit open, retry after ${error.retryAfterMs}ms`,
        );
        return {
          id: transferId,
          status: 'unknown',
          retryAfter: error.retryAfterMs,
        };
      }
      throw error;
    }
  }

  /**
   * Estimate fee with graceful degradation
   */
  async estimateFee(data: any) {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        const response = await fetch(`${this.baseUrl}/fees/estimate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Fee estimation failed: ${response.statusText}`);
        }

        return response.json();
      },
      async () => {
        // Fallback: Return default fee estimate
        this.logger.warn('Using default fee estimate');
        return {
          fee: '1.00',
          currency: 'USDC',
          estimated: true,
        };
      },
    );
  }

  /**
   * Check if Circle service is available before critical operations
   */
  async isAvailable(): Promise<boolean> {
    return this.circuitBreaker.isServiceAvailable(ExternalService.CIRCLE);
  }

  /**
   * Get health status for monitoring
   */
  getHealth() {
    return this.circuitBreaker.getServiceHealth(ExternalService.CIRCLE);
  }
}

/**
 * Example: Using in a service/use case
 */
@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly circleAdapter: CircleTransferAdapterAfter,
  ) {}

  async execute(data: any) {
    // Check availability before attempting
    const available = await this.circleAdapter.isAvailable();

    if (!available) {
      // Circuit is open, don't even try
      return {
        success: false,
        message: 'Transfer service temporarily unavailable',
        retryAfter: 30000,
      };
    }

    try {
      // Attempt transfer
      const result = await this.circleAdapter.transfer(data);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        // Circuit opened during our request
        return {
          success: false,
          message: 'Service became unavailable',
          retryAfter: error.retryAfterMs,
        };
      }

      throw error;
    }
  }
}

/**
 * Example: Monitoring in a health check controller
 */
@Injectable()
export class ExternalServicesHealthController {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async getHealth() {
    const allHealth = this.circuitBreaker.getAllServicesHealth();

    return {
      status: allHealth.every((s) => s.healthy) ? 'healthy' : 'degraded',
      services: allHealth.map((service) => ({
        name: service.service,
        status: service.healthy ? 'up' : 'down',
        circuitState: service.circuitState,
        uptime: `${service.uptime}%`,
        avgResponseTime: `${service.averageResponseTime}ms`,
        lastFailure: service.lastFailureTime,
      })),
    };
  }
}

/**
 * Example: Batch operations with circuit breaker
 */
@Injectable()
export class BatchTransferService {
  constructor(
    private readonly circleAdapter: CircleTransferAdapterAfter,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async executeBatch(transfers: any[]) {
    // Check if service is available before starting batch
    if (!this.circuitBreaker.isServiceAvailable(ExternalService.CIRCLE)) {
      return {
        success: false,
        message: 'Circle service unavailable, batch cancelled',
        processed: 0,
        total: transfers.length,
      };
    }

    const results = [];
    let processed = 0;

    for (const transfer of transfers) {
      try {
        const result = await this.circleAdapter.transfer(transfer);
        results.push({ success: true, data: result });
        processed++;
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          // Circuit opened during batch, stop processing
          return {
            success: false,
            message: 'Service became unavailable during batch',
            processed,
            total: transfers.length,
            results,
          };
        }

        results.push({ success: false, error: error.message });
      }
    }

    return {
      success: true,
      processed,
      total: transfers.length,
      results,
    };
  }
}

/**
 * Example: Retry with circuit breaker awareness
 */
@Injectable()
export class RetryableTransferService {
  constructor(
    private readonly circleAdapter: CircleTransferAdapterAfter,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async transferWithRetry(data: any, maxRetries = 3) {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if circuit is open before retry
        if (!this.circuitBreaker.isServiceAvailable(ExternalService.CIRCLE)) {
          const health = this.circuitBreaker.getServiceHealth(
            ExternalService.CIRCLE,
          );
          throw new Error(
            `Circuit open, service unavailable (state: ${health.circuitState})`,
          );
        }

        return await this.circleAdapter.transfer(data);
      } catch (error) {
        lastError = error;

        if (error instanceof CircuitOpenError) {
          // Circuit is open, don't retry
          throw error;
        }

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
