/**
 * Resilience Module Exports
 *
 * Provides circuit breaker and fault tolerance patterns for external services
 */

export { ResilienceModule } from './resilience.module';
export {
  CircuitBreakerService,
  ExternalService,
  ServiceCircuitConfig,
  FallbackStrategy,
  FallbackConfig,
  ServiceHealthStatus,
  CircuitBreakerMetrics,
} from './circuit-breaker.service';
export { CircuitBreakerController } from './application/controllers/circuit-breaker.controller';
