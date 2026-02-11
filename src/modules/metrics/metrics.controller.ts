import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get metrics health status' })
  @ApiResponse({ status: 200, description: 'Metrics are being collected' })
  getHealth() {
    return {
      status: 'ok',
      message: 'Metrics collection is active',
      endpoint: '/metrics',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current metrics statistics' })
  @ApiResponse({ status: 200, description: 'Current metrics summary' })
  async getStats() {
    // Update heap metrics before returning stats
    this.metricsService.updateHeapMetrics();

    return {
      timestamp: new Date().toISOString(),
      message:
        'Metrics are being collected. Access /metrics endpoint for Prometheus format.',
      prometheus_endpoint: '/metrics',
    };
  }
}
