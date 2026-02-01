import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerController } from './application/controllers/circuit-breaker.controller';

/**
 * Resilience Module
 *
 * Provides fault tolerance and resilience patterns for external service calls.
 * This module is global so the CircuitBreakerService can be injected anywhere.
 *
 * Features:
 * - Circuit breaker pattern for all external services
 * - Configurable thresholds per service
 * - Multiple fallback strategies
 * - Health monitoring and metrics
 * - Runtime configuration updates
 *
 * Services:
 * - Circle API (USDC transfers)
 * - Yellow Card API (Mobile money on/off-ramp)
 * - Twilio API (SMS notifications)
 * - Blnk API (Ledger operations)
 */
@Global()
@Module({
  controllers: [CircuitBreakerController],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}
