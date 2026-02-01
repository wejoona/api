import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCollector,
  HealthCheckResult,
} from '../../domain/interfaces/health-collector.interface';
import { ApiProvider } from '../../domain/entities/api-health-metric.entity';

@Injectable()
export class CircleHealthCollector implements HealthCollector {
  private readonly logger = new Logger(CircleHealthCollector.name);

  constructor(private readonly configService: ConfigService) {}

  getProvider(): ApiProvider {
    return ApiProvider.CIRCLE;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const baseUrl = this.configService.get<string>(
      'circle.apiUrl',
      'https://api.circle.com',
    );
    const apiKey = this.configService.get<string>('circle.apiKey', '');
    const endpoint = '/v1/configuration';
    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      // Circle API is considered healthy if it responds (even with auth errors)
      const available =
        response.ok || response.status === 401 || response.status === 403;

      return {
        provider: ApiProvider.CIRCLE,
        endpoint,
        available,
        latencyMs,
        statusCode: response.status,
        metadata: {
          baseUrl,
          hasApiKey: !!apiKey,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Circle health check failed: ${errorMessage}`);

      return {
        provider: ApiProvider.CIRCLE,
        endpoint,
        available: false,
        latencyMs,
        errorMessage,
        metadata: {
          baseUrl,
          errorType: error.constructor.name,
        },
      };
    }
  }
}
