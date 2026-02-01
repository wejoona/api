import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import {
  CircuitBreakerService,
  ExternalService,
  ServiceCircuitConfig,
} from '../../circuit-breaker.service';

/**
 * DTO for updating circuit breaker configuration
 */
export class UpdateCircuitConfigDto {
  failureThreshold?: number;
  resetTimeout?: number;
  requestTimeout?: number;
  enabled?: boolean;
}

/**
 * Circuit Breaker Controller
 *
 * Provides endpoints for monitoring and managing circuit breakers.
 * These endpoints are protected and should only be accessible to admins.
 *
 * Endpoints:
 * - GET /resilience/health - Get health status of all services
 * - GET /resilience/health/:service - Get health status of specific service
 * - GET /resilience/metrics - Get metrics for all services
 * - GET /resilience/metrics/:service - Get metrics for specific service
 * - POST /resilience/:service/reset - Reset circuit breaker
 * - POST /resilience/:service/open - Manually open circuit breaker
 * - POST /resilience/:service/config - Update circuit breaker configuration
 */
@Controller('resilience')
@UseGuards(JwtAuthGuard)
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Get health status of all external services
   * @returns Array of service health statuses
   */
  @Get('health')
  async getAllServicesHealth() {
    const health = this.circuitBreakerService.getAllServicesHealth();
    return {
      timestamp: new Date().toISOString(),
      services: health,
      healthy: health.every((s) => s.healthy),
    };
  }

  /**
   * Get health status of a specific service
   * @param service The external service name
   * @returns Service health status
   */
  @Get('health/:service')
  async getServiceHealth(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    const health = this.circuitBreakerService.getServiceHealth(serviceEnum);

    return {
      timestamp: new Date().toISOString(),
      ...health,
    };
  }

  /**
   * Get metrics for all services
   * @returns Metrics for all services
   */
  @Get('metrics')
  async getAllMetrics() {
    const metrics = this.circuitBreakerService.getAllMetrics();
    return {
      timestamp: new Date().toISOString(),
      metrics,
    };
  }

  /**
   * Get metrics for a specific service
   * @param service The external service name
   * @returns Service metrics
   */
  @Get('metrics/:service')
  async getServiceMetrics(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    const metrics = this.circuitBreakerService.getServiceMetrics(serviceEnum);

    return {
      timestamp: new Date().toISOString(),
      service: serviceEnum,
      metrics,
    };
  }

  /**
   * Get circuit breaker configuration for a service
   * @param service The external service name
   * @returns Service configuration
   */
  @Get('config/:service')
  async getServiceConfig(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    const config = this.circuitBreakerService.getServiceConfig(serviceEnum);
    const fallbackConfig =
      this.circuitBreakerService.getFallbackConfig(serviceEnum);

    return {
      timestamp: new Date().toISOString(),
      service: serviceEnum,
      circuitConfig: config,
      fallbackConfig,
    };
  }

  /**
   * Reset a circuit breaker to closed state
   * @param service The external service name
   */
  @Post(':service/reset')
  @HttpCode(HttpStatus.OK)
  async resetCircuit(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    this.circuitBreakerService.resetCircuit(serviceEnum);

    return {
      success: true,
      message: `Circuit breaker reset for ${serviceEnum}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manually open a circuit breaker (for maintenance)
   * @param service The external service name
   */
  @Post(':service/open')
  @HttpCode(HttpStatus.OK)
  async openCircuit(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    this.circuitBreakerService.openCircuit(serviceEnum);

    return {
      success: true,
      message: `Circuit breaker opened for ${serviceEnum}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update circuit breaker configuration at runtime
   * @param service The external service name
   * @param dto Configuration update
   */
  @Post(':service/config')
  @HttpCode(HttpStatus.OK)
  async updateConfig(
    @Param('service') service: string,
    @Body() dto: UpdateCircuitConfigDto,
  ) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    this.circuitBreakerService.updateServiceConfig(
      serviceEnum,
      dto as Partial<ServiceCircuitConfig>,
    );

    return {
      success: true,
      message: `Configuration updated for ${serviceEnum}`,
      config: dto,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all circuit breakers
   */
  @Post('reset-all')
  @HttpCode(HttpStatus.OK)
  async resetAllCircuits() {
    this.circuitBreakerService.resetAllCircuits();

    return {
      success: true,
      message: 'All circuit breakers reset',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if a service is currently available
   * @param service The external service name
   */
  @Get(':service/available')
  async checkServiceAvailability(@Param('service') service: string) {
    const serviceEnum = service.toLowerCase() as ExternalService;
    const available =
      this.circuitBreakerService.isServiceAvailable(serviceEnum);

    return {
      service: serviceEnum,
      available,
      timestamp: new Date().toISOString(),
    };
  }
}
